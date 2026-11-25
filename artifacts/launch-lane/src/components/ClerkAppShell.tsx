import { ClerkProvider } from "@clerk/react";
import { useLocation } from "wouter";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

function stripBase(path: string) {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

const appearance = {
  theme: "simple" as const,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.png`,
  },
  variables: {
    colorPrimary: "#144d48",
    colorForeground: "#2b2620",
    colorMutedForeground: "#5e564c",
    colorDanger: "#8a2f1b",
    colorBackground: "#ffffff",
    colorInput: "#ffffff",
    colorInputForeground: "#2b2620",
    colorNeutral: "#2b2620",
    fontFamily: '"Figtree", system-ui, sans-serif',
    borderRadius: "18px",
  },
  elements: {
    rootBox: {
      width: "100%",
      display: "flex",
      justifyContent: "center",
    },
    cardBox: {
      width: "min(440px, 100%)",
      backgroundColor: "#ffffff",
      borderRadius: "22px",
      boxShadow: "0 18px 50px rgba(43, 38, 32, 0.12)",
      overflow: "hidden",
    },
    card: {
      backgroundColor: "transparent",
      border: "none",
      borderRadius: "0",
      boxShadow: "none",
    },
    footer: {
      backgroundColor: "transparent",
      border: "none",
      boxShadow: "none",
    },
    headerTitle: {
      color: "#144d48",
      fontFamily: '"Alfa Slab One", Georgia, serif',
      fontWeight: "400",
    },
    headerSubtitle: { color: "#5e564c" },
    formButtonPrimary: {
      backgroundColor: "#144d48",
      borderRadius: "999px",
      fontFamily: '"Figtree", system-ui, sans-serif',
    },
    socialButtonsBlockButton: {
      borderRadius: "999px",
      borderColor: "#e4dccb",
      fontFamily: '"Figtree", system-ui, sans-serif',
    },
    formFieldInput: {
      borderRadius: "10px",
      borderColor: "#e4dccb",
      fontFamily: '"Figtree", system-ui, sans-serif',
    },
  },
};

if (!clerkPubKey) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY for Launch Lane sign-in.");
}

export default function ClerkAppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      appearance={appearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      localization={{
        signIn: {
          start: {
            title: "Log in to Launch Lane",
            subtitle: "Welcome back.",
          },
        },
        signUp: {
          start: {
            title: "Join Launch Lane",
            subtitle: "Create your Launch Lane account.",
          },
        },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      {children}
    </ClerkProvider>
  );
}
