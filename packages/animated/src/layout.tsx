import type * as Gtk from "@gtkx/gi/gtk";
import { scheduleAfterLayout } from "@gtkx/react/internal";
import type { IProjectionNode, MotionProps, VisualElement } from "motion/react";
import {
    createProjectionNode,
    frame,
    globalProjectionState,
    LayoutGroupContext,
    microtask,
    SwitchLayoutGroupContext,
    usePresence,
} from "motion/react";
import type { ContextType, JSX } from "react";
import { Component, useContext } from "react";

const zeroScroll = (): { x: number; y: number } => ({ x: 0, y: 0 });

const GtkRootProjectionNode = createProjectionNode<Gtk.Widget>({
    measureScroll: zeroScroll,
    checkIsScrollRoot: () => true,
});

const rootProjectionNode: { current: IProjectionNode | null } = { current: null };

export const GtkProjectionNode: ReturnType<typeof createProjectionNode<Gtk.Widget>> = createProjectionNode<Gtk.Widget>({
    measureScroll: zeroScroll,
    checkIsScrollRoot: () => false,
    defaultParent: () => {
        if (!rootProjectionNode.current) {
            const rootNode = new GtkRootProjectionNode({});
            rootNode.mount({} as unknown as Gtk.Widget);
            rootNode.setOptions({ layoutScroll: true });
            rootProjectionNode.current = rootNode as unknown as IProjectionNode;
        }
        return rootProjectionNode.current;
    },
});

type MeasureContextProps = {
    layoutGroup: ContextType<typeof LayoutGroupContext>;
    switchLayoutGroup: ContextType<typeof SwitchLayoutGroupContext>;
    isPresent: boolean;
    safeToRemove: (() => void) | null | undefined;
};

type MeasureProps = MotionProps & { visualElement: VisualElement<Gtk.Widget> } & MeasureContextProps;

let hasTakenAnySnapshot = false;

const didUpdateAfterAllocation = (
    visualElement: VisualElement<Gtk.Widget>,
    projection: IProjectionNode,
    onMeasured?: () => void,
): void => {
    scheduleAfterLayout(visualElement.current, () => {
        projection.root?.didUpdate();
        onMeasured?.();
    });
};

class MeasureLayoutWithContext extends Component<MeasureProps> {
    override componentDidMount(): void {
        const { visualElement, layoutGroup, switchLayoutGroup, layoutId } = this.props;
        const { projection } = visualElement;
        if (projection) {
            if (layoutGroup.group) layoutGroup.group.add(projection);
            if (switchLayoutGroup?.register && layoutId) {
                switchLayoutGroup.register(projection);
            }
            if (hasTakenAnySnapshot) {
                didUpdateAfterAllocation(visualElement, projection);
            }
            projection.addEventListener?.("animationComplete", () => {
                this.safeToRemove();
            });
            projection.setOptions({
                ...projection.options,
                layoutDependency: this.props.layoutDependency,
                onExitComplete: () => this.safeToRemove(),
            });
        }
        globalProjectionState.hasEverUpdated = true;
    }

    override getSnapshotBeforeUpdate(prevProps: MeasureProps): null {
        const { layoutDependency, visualElement, drag, isPresent } = this.props;
        const { projection } = visualElement;
        if (!projection) return null;
        projection.isPresent = isPresent;
        if (prevProps.layoutDependency !== layoutDependency) {
            projection.setOptions({ ...projection.options, layoutDependency });
        }
        hasTakenAnySnapshot = true;
        if (
            drag ||
            prevProps.layoutDependency !== layoutDependency ||
            layoutDependency === undefined ||
            prevProps.isPresent !== isPresent
        ) {
            projection.willUpdate();
        } else {
            this.safeToRemove();
        }
        if (prevProps.isPresent !== isPresent) {
            if (isPresent) {
                projection.promote();
            } else if (!projection.relegate()) {
                frame.postRender(() => {
                    const stack = projection.getStack();
                    if (!stack?.members.length) {
                        this.safeToRemove();
                    }
                });
            }
        }
        return null;
    }

    override componentDidUpdate(): void {
        const { visualElement, layoutAnchor } = this.props;
        const { projection } = visualElement;
        if (projection) {
            projection.options.layoutAnchor = layoutAnchor;
            didUpdateAfterAllocation(visualElement, projection, () => {
                microtask.postRender(() => {
                    if (!projection.currentAnimation && projection.isLead()) {
                        this.safeToRemove();
                    }
                });
            });
        }
    }

    override componentWillUnmount(): void {
        const { visualElement, layoutGroup, switchLayoutGroup } = this.props;
        const { projection } = visualElement;
        hasTakenAnySnapshot = true;
        if (projection) {
            projection.scheduleCheckAfterUnmount();
            if (layoutGroup?.group) layoutGroup.group.remove(projection);
            if (switchLayoutGroup?.deregister) switchLayoutGroup.deregister(projection);
        }
    }

    safeToRemove(): void {
        this.props.safeToRemove?.();
    }

    override render(): null {
        return null;
    }
}

export const MeasureLayout = (props: MotionProps & { visualElement: VisualElement<Gtk.Widget> }): JSX.Element => {
    const [isPresent, safeToRemove] = usePresence();
    const layoutGroup = useContext(LayoutGroupContext);
    return (
        <MeasureLayoutWithContext
            {...props}
            layoutGroup={layoutGroup}
            switchLayoutGroup={useContext(SwitchLayoutGroupContext)}
            isPresent={isPresent}
            safeToRemove={safeToRemove}
        />
    );
};
