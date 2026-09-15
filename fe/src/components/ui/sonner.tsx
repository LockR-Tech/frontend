import { useTheme } from "~/context/theme-context";
import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ position = "top-center", ...props }: ToasterProps) => {
  let currentTheme: "light" | "dark" | "system" = "system";
  try {
    const themeContext = useTheme();
    if (themeContext?.theme) {
      currentTheme = themeContext.theme;
    }
  } catch {
    currentTheme = "system";
  }

  return (
    <Sonner
      theme={currentTheme as ToasterProps["theme"]}
      className="toaster group !z-[999999]"
      richColors
      closeButton
      duration={4000}
      visibleToasts={5}
      expand={true}
      style={{ zIndex: 999999 }}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-2xl font-sans text-sm rounded-xl py-3 px-4",
          description: "group-[.toast]:text-muted-foreground text-xs mt-1",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground text-xs",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground text-xs",
        },
      }}
      {...props}
      position={position}
    />
  );
};

export { Toaster };
