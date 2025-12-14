import { Orientation } from "@gtkx/ffi/gtk";
import {
    AdwActionRow,
    AdwApplicationWindow,
    AdwAvatar,
    AdwBanner,
    AdwButtonContent,
    AdwClamp,
    AdwHeaderBar,
    AdwPreferencesGroup,
    AdwSpinRow,
    AdwStatusPage,
    AdwSwitchRow,
    AdwToolbarView,
    AdwWindowTitle,
    Box,
    Button,
    Image,
    quit,
    ScrolledWindow,
} from "@gtkx/react";
import { useState } from "react";

type Page = "welcome" | "components" | "settings";

const WelcomePage = ({ onNavigate }: { onNavigate: (page: Page) => void }) => (
    <AdwStatusPage
        title="Welcome to GTKX"
        description="Build native Linux desktop apps with React and TypeScript"
        iconName="org.gnome.Adwaita1.Demo"
    >
        <Box orientation={Orientation.VERTICAL} spacing={12}>
            <Button cssClasses={["suggested-action", "pill"]} onClicked={() => onNavigate("components")}>
                <AdwButtonContent iconName="applications-graphics-symbolic" label="View Components" />
            </Button>
            <Button cssClasses={["pill"]} onClicked={() => onNavigate("settings")}>
                <AdwButtonContent iconName="emblem-system-symbolic" label="Settings" />
            </Button>
        </Box>
    </AdwStatusPage>
);

const AvatarShowcase = () => (
    <AdwPreferencesGroup.Root title="Avatars" description="User avatar widgets with fallback initials">
        <AdwActionRow.Root title="Small Avatar" subtitle="32px size">
            <AdwAvatar size={32} text="Alice Smith" showInitials />
        </AdwActionRow.Root>
        <AdwActionRow.Root title="Medium Avatar" subtitle="48px size">
            <AdwAvatar size={48} text="Bob Johnson" showInitials />
        </AdwActionRow.Root>
        <AdwActionRow.Root title="Large Avatar" subtitle="64px size">
            <AdwAvatar size={64} text="Charlie Brown" showInitials />
        </AdwActionRow.Root>
    </AdwPreferencesGroup.Root>
);

const ButtonShowcase = () => (
    <AdwPreferencesGroup.Root title="Buttons" description="Button styles and variants">
        <Box orientation={Orientation.HORIZONTAL} spacing={12} marginTop={12} marginBottom={12} halign={3}>
            <Button cssClasses={["suggested-action", "pill"]}>
                <AdwButtonContent iconName="list-add-symbolic" label="Add" />
            </Button>
            <Button cssClasses={["destructive-action", "pill"]}>
                <AdwButtonContent iconName="user-trash-symbolic" label="Delete" />
            </Button>
            <Button cssClasses={["pill"]}>
                <AdwButtonContent iconName="document-save-symbolic" label="Save" />
            </Button>
        </Box>
    </AdwPreferencesGroup.Root>
);

const ComponentsPage = () => (
    <ScrolledWindow vexpand hscrollbarPolicy={2}>
        <AdwClamp maximumSize={600} marginTop={24} marginBottom={24} marginStart={12} marginEnd={12}>
            <Box orientation={Orientation.VERTICAL} spacing={24}>
                <AvatarShowcase />
                <ButtonShowcase />
            </Box>
        </AdwClamp>
    </ScrolledWindow>
);

const SettingsPage = () => {
    const [darkMode, setDarkMode] = useState(false);
    const [notifications, setNotifications] = useState(true);
    const [soundEnabled, setSoundEnabled] = useState(true);
    const [showBanner, setShowBanner] = useState(true);
    const [fontSize] = useState(14);

    return (
        <ScrolledWindow vexpand hscrollbarPolicy={2}>
            <AdwClamp maximumSize={600} marginTop={24} marginBottom={24} marginStart={12} marginEnd={12}>
                <Box orientation={Orientation.VERTICAL} spacing={24}>
                    {showBanner && (
                        <AdwBanner
                            title="Welcome! Explore the settings below."
                            revealed
                            buttonLabel="Dismiss"
                            onButtonClicked={() => setShowBanner(false)}
                        />
                    )}

                    <AdwPreferencesGroup.Root title="Appearance" description="Customize the look and feel">
                        <AdwSwitchRow
                            title="Dark Mode"
                            subtitle="Use dark color scheme"
                            active={darkMode}
                            onActivate={() => setDarkMode(!darkMode)}
                        />
                        <AdwSpinRow
                            title="Font Size"
                            subtitle="Adjust the default font size"
                            value={fontSize}
                            climbRate={1}
                            digits={0}
                        />
                    </AdwPreferencesGroup.Root>

                    <AdwPreferencesGroup.Root title="Notifications">
                        <AdwSwitchRow
                            title="Enable Notifications"
                            subtitle="Receive alerts and updates"
                            active={notifications}
                            onActivate={() => setNotifications(!notifications)}
                        />
                        <AdwSwitchRow
                            title="Sound"
                            subtitle="Play notification sounds"
                            active={soundEnabled}
                            onActivate={() => setSoundEnabled(!soundEnabled)}
                        />
                    </AdwPreferencesGroup.Root>

                    <AdwPreferencesGroup.Root title="Account">
                        <AdwActionRow.Root title="Profile" subtitle="Manage your account settings" activatable>
                            <AdwAvatar size={40} text="Demo User" showInitials />
                        </AdwActionRow.Root>
                        <AdwActionRow.Root title="Storage" subtitle="2.4 GB of 15 GB used">
                            <Image iconName="drive-harddisk-symbolic" iconSize={1} />
                        </AdwActionRow.Root>
                    </AdwPreferencesGroup.Root>

                    <AdwPreferencesGroup.Root title="About">
                        <AdwActionRow.Root title="Version" subtitle="1.0.0">
                            <Image iconName="dialog-information-symbolic" iconSize={1} />
                        </AdwActionRow.Root>
                        <AdwActionRow.Root title="License" subtitle="MIT License" />
                        <AdwActionRow.Root title="Website" subtitle="https://github.com/anthropics/gtkx" activatable>
                            <Image iconName="web-browser-symbolic" iconSize={1} />
                        </AdwActionRow.Root>
                    </AdwPreferencesGroup.Root>
                </Box>
            </AdwClamp>
        </ScrolledWindow>
    );
};

const PageTitle: Record<Page, string> = {
    welcome: "Welcome",
    components: "Components",
    settings: "Settings",
};

export const App = () => {
    const [currentPage, setCurrentPage] = useState<Page>("welcome");

    return (
        <AdwApplicationWindow.Root defaultWidth={500} defaultHeight={700} onCloseRequest={quit}>
            <AdwApplicationWindow.Content>
                <AdwToolbarView.Root>
                    <AdwToolbarView.Top>
                        <AdwHeaderBar.Root>
                            <AdwHeaderBar.TitleWidget>
                                <AdwWindowTitle title="Adwaita Demo" subtitle={PageTitle[currentPage]} />
                            </AdwHeaderBar.TitleWidget>
                            {currentPage !== "welcome" && (
                                <Button iconName="go-home-symbolic" onClicked={() => setCurrentPage("welcome")} />
                            )}
                        </AdwHeaderBar.Root>
                    </AdwToolbarView.Top>
                    <AdwToolbarView.Content>
                        {currentPage === "welcome" && <WelcomePage onNavigate={setCurrentPage} />}
                        {currentPage === "components" && <ComponentsPage />}
                        {currentPage === "settings" && <SettingsPage />}
                    </AdwToolbarView.Content>
                </AdwToolbarView.Root>
            </AdwApplicationWindow.Content>
        </AdwApplicationWindow.Root>
    );
};

export default App;

export const appId = "org.gtkx.AdwaitaDemo";
