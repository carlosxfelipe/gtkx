import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { GirRepository, type RepositoryOptions } from "@gtkx/gir";
import { FfiGenerator } from "../ffi/ffi-generator.js";
import { ReactGenerator } from "../react/react-generator.js";
import type { CodegenWidgetMeta } from "./codegen-metadata.js";
import { CodegenProject } from "./project.js";

const NON_INTROSPECTABLE_NAMESPACES = new Set(["Pango"]);

type CodegenOrchestratorOptions = {
    girsDir: string;
    ffiOutputDir: string;
    reactOutputDir: string;
};

type CodegenResult = {
    ffiFiles: Map<string, string>;
    reactFiles: Map<string, string>;
    stats: CodegenStats;
};

type CodegenStats = {
    namespaces: number;
    widgets: number;
    totalFiles: number;
    duration: number;
};

export class CodegenOrchestrator {
    private readonly options: CodegenOrchestratorOptions;
    private readonly project: CodegenProject;
    private readonly repository: GirRepository;

    constructor(options: CodegenOrchestratorOptions) {
        this.options = options;
        this.project = new CodegenProject();
        const repositoryOptions: RepositoryOptions = {
            includeNonIntrospectableNamespaces: NON_INTROSPECTABLE_NAMESPACES,
        };
        this.repository = new GirRepository(repositoryOptions);
    }

    async generate(): Promise<CodegenResult> {
        const startTime = performance.now();

        await this.loadGirFiles();
        await this.generateFfi();
        this.generateReact();

        const { ffi: ffiFiles, react: reactFiles } = await this.project.emitGrouped();
        this.releaseAstNodes();

        const duration = performance.now() - startTime;
        const stats = this.computeStats(ffiFiles, reactFiles, duration);

        return { ffiFiles, reactFiles, stats };
    }

    getProject(): CodegenProject {
        return this.project;
    }

    getRepository(): GirRepository {
        return this.repository;
    }

    getAllWidgetMeta(): CodegenWidgetMeta[] {
        return this.project.metadata.getAllWidgetMeta();
    }

    private async loadGirFiles(): Promise<void> {
        const { girsDir } = this.options;
        const girFiles = await getAvailableGirFiles(girsDir);

        for (const filename of girFiles) {
            const filePath = join(girsDir, filename);
            await this.repository.loadFromFile(filePath);
        }

        this.repository.resolve();
    }

    private async generateFfi(): Promise<void> {
        const allNamespaces = this.repository.getNamespaceNames();

        for (const namespace of allNamespaces) {
            const generator = new FfiGenerator({
                outputDir: this.options.ffiOutputDir,
                namespace,
                repository: this.repository,
                project: this.project,
                skipEmit: true,
            });

            await generator.generateNamespace(namespace);
        }
    }

    private generateReact(): void {
        const widgetMeta = this.project.metadata.getAllWidgetMeta();
        if (widgetMeta.length === 0) {
            return;
        }

        const namespaceNames = [...new Set(widgetMeta.map((m) => m.namespace))];
        const generator = new ReactGenerator(widgetMeta, this.project, namespaceNames);
        generator.generate();
    }

    private computeStats(
        ffiFiles: Map<string, string>,
        reactFiles: Map<string, string>,
        duration: number,
    ): CodegenStats {
        const widgetMeta = this.project.metadata.getAllWidgetMeta();

        return {
            namespaces: this.repository.getNamespaceNames().length,
            widgets: widgetMeta.length,
            totalFiles: ffiFiles.size + reactFiles.size,
            duration: Math.round(duration),
        };
    }

    private releaseAstNodes(): void {
        for (const sourceFile of this.project.getSourceFiles()) {
            sourceFile.forgetDescendants();
        }
    }
}

async function getAvailableGirFiles(girsDir: string): Promise<string[]> {
    const files = await readdir(girsDir);
    return files.filter((f) => f.endsWith(".gir"));
}
