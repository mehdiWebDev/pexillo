import "@/src/styles/globals.scss";
import "@/src/styles/main.scss";



// Minimal root layout - just sets up fonts and styles
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
