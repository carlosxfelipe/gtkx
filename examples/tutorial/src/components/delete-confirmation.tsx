import { Dialog } from "@gtkx/components/adw";
import * as Adw from "@gtkx/gi/adw";
import { AdwAlertDialog } from "@gtkx/jsx/adw";

export const DeleteConfirmation = ({
    taskTitle,
    onConfirm,
    onCancel,
}: {
    taskTitle: string;
    onConfirm: () => void;
    onCancel: () => void;
}) => {
    return (
        <Dialog>
            {(ref) => (
                <AdwAlertDialog
                    ref={ref}
                    heading="Delete Task?"
                    body={`“${taskTitle}” will be permanently deleted. This cannot be undone.`}
                    defaultResponse="cancel"
                    closeResponse="cancel"
                    responses={[
                        { id: "cancel", label: "Cancel" },
                        { id: "delete", label: "Delete", appearance: Adw.ResponseAppearance.DESTRUCTIVE },
                    ]}
                    onResponse={(id) => {
                        if (id === "delete") onConfirm();
                        else onCancel();
                    }}
                />
            )}
        </Dialog>
    );
};
