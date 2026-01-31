import * as Gtk from "@gtkx/ffi/gtk";
import {
    AdwActionRow,
    AdwExpanderRow,
    AdwPreferencesGroup,
    AdwToolbarView,
    GtkBox,
    GtkButton,
    GtkCheckButton,
    GtkFrame,
    GtkImage,
    GtkLabel,
    GtkSwitch,
    x,
} from "@gtkx/react";
import { useState } from "react";

export const RowDemo = () => {
    const [switchValue, setSwitchValue] = useState(false);
    const [checkValue, setCheckValue] = useState(true);

    return (
        <GtkBox
            orientation={Gtk.Orientation.VERTICAL}
            spacing={24}
            marginTop={24}
            marginBottom={24}
            marginStart={24}
            marginEnd={24}
        >
            <GtkLabel label="Row Components" cssClasses={["title-1"]} halign={Gtk.Align.START} />

            <AdwPreferencesGroup
                title="x.ActionRowPrefix / x.ActionRowSuffix"
                description="Add widgets to the start or end of action rows"
            >
                <AdwActionRow title="Notifications" subtitle="Receive push notifications">
                    <x.ContainerSlot for={AdwActionRow} id="addPrefix">
                        <GtkImage iconName="preferences-system-notifications-symbolic" />
                    </x.ContainerSlot>
                    <x.ContainerSlot for={AdwActionRow} id="addSuffix">
                        <GtkSwitch
                            valign={Gtk.Align.CENTER}
                            active={switchValue}
                            onStateSet={(state) => {
                                setSwitchValue(state);
                                return true;
                            }}
                        />
                    </x.ContainerSlot>
                </AdwActionRow>

                <AdwActionRow title="Dark Mode" subtitle="Use dark color scheme">
                    <x.ContainerSlot for={AdwActionRow} id="addPrefix">
                        <GtkImage iconName="weather-clear-night-symbolic" />
                    </x.ContainerSlot>
                    <x.ContainerSlot for={AdwActionRow} id="addSuffix">
                        <GtkCheckButton active={checkValue} onToggled={(button) => setCheckValue(button.getActive())} />
                    </x.ContainerSlot>
                </AdwActionRow>

                <AdwActionRow title="Account" subtitle="Manage your account settings" activatable>
                    <x.ContainerSlot for={AdwActionRow} id="addPrefix">
                        <GtkImage iconName="avatar-default-symbolic" />
                    </x.ContainerSlot>
                    <x.ContainerSlot for={AdwActionRow} id="addSuffix">
                        <GtkImage iconName="go-next-symbolic" cssClasses={["dim-label"]} />
                    </x.ContainerSlot>
                </AdwActionRow>
            </AdwPreferencesGroup>

            <AdwPreferencesGroup title="x.ExpanderRowRow" description="Nested rows inside an expander row">
                <AdwExpanderRow title="Network Settings" subtitle="Configure network options">
                    <x.ContainerSlot for={AdwExpanderRow} id="addPrefix">
                        <GtkImage iconName="network-wired-symbolic" />
                    </x.ContainerSlot>
                    <x.ContainerSlot for={AdwExpanderRow} id="addRow">
                        <AdwActionRow title="WiFi">
                            <x.ContainerSlot for={AdwActionRow} id="addSuffix">
                                <GtkSwitch valign={Gtk.Align.CENTER} active />
                            </x.ContainerSlot>
                        </AdwActionRow>
                        <AdwActionRow title="Bluetooth">
                            <x.ContainerSlot for={AdwActionRow} id="addSuffix">
                                <GtkSwitch valign={Gtk.Align.CENTER} />
                            </x.ContainerSlot>
                        </AdwActionRow>
                        <AdwActionRow title="Airplane Mode">
                            <x.ContainerSlot for={AdwActionRow} id="addSuffix">
                                <GtkSwitch valign={Gtk.Align.CENTER} />
                            </x.ContainerSlot>
                        </AdwActionRow>
                    </x.ContainerSlot>
                </AdwExpanderRow>

                <AdwExpanderRow title="Privacy" subtitle="Control your privacy settings">
                    <x.ContainerSlot for={AdwExpanderRow} id="addPrefix">
                        <GtkImage iconName="channel-secure-symbolic" />
                    </x.ContainerSlot>
                    <x.ContainerSlot for={AdwExpanderRow} id="addRow">
                        <AdwActionRow title="Location Services" activatable>
                            <x.ContainerSlot for={AdwActionRow} id="addSuffix">
                                <GtkImage iconName="go-next-symbolic" cssClasses={["dim-label"]} />
                            </x.ContainerSlot>
                        </AdwActionRow>
                        <AdwActionRow title="Camera Access" activatable>
                            <x.ContainerSlot for={AdwActionRow} id="addSuffix">
                                <GtkImage iconName="go-next-symbolic" cssClasses={["dim-label"]} />
                            </x.ContainerSlot>
                        </AdwActionRow>
                        <AdwActionRow title="Microphone Access" activatable>
                            <x.ContainerSlot for={AdwActionRow} id="addSuffix">
                                <GtkImage iconName="go-next-symbolic" cssClasses={["dim-label"]} />
                            </x.ContainerSlot>
                        </AdwActionRow>
                    </x.ContainerSlot>
                </AdwExpanderRow>
            </AdwPreferencesGroup>

            <AdwPreferencesGroup title="x.ExpanderRowAction" description="Action widgets in the expander row header">
                <AdwExpanderRow title="Accounts" subtitle="Manage connected accounts">
                    <x.ContainerSlot for={AdwExpanderRow} id="addPrefix">
                        <GtkImage iconName="system-users-symbolic" />
                    </x.ContainerSlot>
                    <x.ContainerSlot for={AdwExpanderRow} id="addAction">
                        <GtkButton
                            iconName="list-add-symbolic"
                            valign={Gtk.Align.CENTER}
                            cssClasses={["flat"]}
                            tooltipText="Add Account"
                        />
                    </x.ContainerSlot>
                    <x.ContainerSlot for={AdwExpanderRow} id="addRow">
                        <AdwActionRow title="Google" subtitle="alice@gmail.com">
                            <x.ContainerSlot for={AdwActionRow} id="addPrefix">
                                <GtkImage iconName="mail-symbolic" />
                            </x.ContainerSlot>
                        </AdwActionRow>
                        <AdwActionRow title="GitHub" subtitle="alice-dev">
                            <x.ContainerSlot for={AdwActionRow} id="addPrefix">
                                <GtkImage iconName="applications-development-symbolic" />
                            </x.ContainerSlot>
                        </AdwActionRow>
                    </x.ContainerSlot>
                </AdwExpanderRow>
            </AdwPreferencesGroup>

            <AdwPreferencesGroup
                title="x.ToolbarTop / x.ToolbarBottom"
                description="Place toolbars at top or bottom of AdwToolbarView"
            >
                <GtkFrame marginTop={12}>
                    <AdwToolbarView>
                        <x.ContainerSlot for={AdwToolbarView} id="addTopBar">
                            <GtkBox cssClasses={["toolbar"]} spacing={6}>
                                <GtkButton iconName="document-new-symbolic" tooltipText="New" />
                                <GtkButton iconName="document-open-symbolic" tooltipText="Open" />
                                <GtkButton iconName="document-save-symbolic" tooltipText="Save" />
                            </GtkBox>
                        </x.ContainerSlot>

                        <GtkBox
                            orientation={Gtk.Orientation.VERTICAL}
                            halign={Gtk.Align.CENTER}
                            valign={Gtk.Align.CENTER}
                            heightRequest={150}
                        >
                            <GtkLabel label="Content Area" cssClasses={["dim-label"]} />
                        </GtkBox>

                        <x.ContainerSlot for={AdwToolbarView} id="addBottomBar">
                            <GtkBox cssClasses={["toolbar"]} spacing={6}>
                                <GtkLabel label="Status: Ready" hexpand halign={Gtk.Align.START} marginStart={6} />
                                <GtkButton iconName="zoom-out-symbolic" tooltipText="Zoom Out" />
                                <GtkButton iconName="zoom-in-symbolic" tooltipText="Zoom In" />
                            </GtkBox>
                        </x.ContainerSlot>
                    </AdwToolbarView>
                </GtkFrame>
            </AdwPreferencesGroup>
        </GtkBox>
    );
};
