import {
    type ExportDeclarationStructure,
    ModuleKind,
    Project,
    ScriptTarget,
    type SourceFile,
    StructureKind,
} from "ts-morph";
import { CodegenMetadata } from "./codegen-metadata.js";
import { getBiome } from "./utils/format.js";

export class CodegenProject {
    private project: Project;
    private readonly _metadata: CodegenMetadata;

    constructor() {
        this.project = new Project({
            compilerOptions: {
                strict: true,
                target: ScriptTarget.ESNext,
                module: ModuleKind.ESNext,
                declaration: true,
                esModuleInterop: true,
                skipLibCheck: true,
            },
            useInMemoryFileSystem: true,
        });
        this._metadata = new CodegenMetadata();
    }

    get metadata(): CodegenMetadata {
        return this._metadata;
    }

    createSourceFile(filePath: string): SourceFile {
        return this.project.createSourceFile(filePath, "", { overwrite: true });
    }

    createFfiSourceFile(filePath: string): SourceFile {
        return this.project.createSourceFile(`ffi/${filePath}`, "", { overwrite: true });
    }

    createReactSourceFile(filePath: string): SourceFile {
        return this.project.createSourceFile(`react/${filePath}`, "", { overwrite: true });
    }

    createIndexSourceFile(filePath: string, fileNames: Iterable<string>): SourceFile {
        const sourceFile = this.project.createSourceFile(filePath, "", { overwrite: true });

        const exportStructures: ExportDeclarationStructure[] = [...fileNames]
            .filter((f) => f !== "index.ts")
            .sort()
            .map((f) => ({
                kind: StructureKind.ExportDeclaration as const,
                moduleSpecifier: `./${f.replace(/\.ts$/, "")}.js`,
            }));

        sourceFile.addExportDeclarations(exportStructures);
        return sourceFile;
    }

    getSourceFile(filePath: string): SourceFile | null {
        return this.project.getSourceFile(filePath) ?? null;
    }

    getSourceFiles(): SourceFile[] {
        return this.project.getSourceFiles();
    }

    getSourceFilesInNamespace(namespace: string): SourceFile[] {
        const nsLower = namespace.toLowerCase();
        return this.project.getSourceFiles().filter((sf) => {
            const path = sf.getFilePath();
            return path.includes(`/${nsLower}/`) || path.startsWith(`${nsLower}/`);
        });
    }

    async emit(): Promise<Map<string, string>> {
        const sourceFiles = this.project.getSourceFiles();

        await getBiome();

        const result = new Map<string, string>();
        for (const sourceFile of sourceFiles) {
            const filePath = sourceFile.getFilePath().replace(/^\//, "");
            const content = sourceFile.getFullText();
            const formatted = await this.formatCode(content, filePath);
            result.set(filePath, formatted);
        }

        return result;
    }

    async emitGrouped(): Promise<{
        ffi: Map<string, string>;
        react: Map<string, string>;
    }> {
        const sourceFiles = this.project.getSourceFiles();

        await getBiome();

        const ffi = new Map<string, string>();
        const react = new Map<string, string>();

        for (const sourceFile of sourceFiles) {
            const fullPath = sourceFile.getFilePath().replace(/^\//, "");
            const content = sourceFile.getFullText();
            const formatted = await this.formatCode(content, fullPath);

            if (fullPath.startsWith("ffi/")) {
                const relativePath = fullPath.slice(4);
                ffi.set(relativePath, formatted);
            } else if (fullPath.startsWith("react/")) {
                const relativePath = fullPath.slice(6);
                react.set(relativePath, formatted);
            }
        }

        return { ffi, react };
    }

    getProject(): Project {
        return this.project;
    }

    private async formatCode(code: string, filePath: string): Promise<string> {
        try {
            const { biome, projectKey } = await getBiome();
            const result = biome.formatContent(projectKey, code, { filePath });
            return result.content;
        } catch (error) {
            console.warn("Failed to format code:", error);
            return code;
        }
    }
}
