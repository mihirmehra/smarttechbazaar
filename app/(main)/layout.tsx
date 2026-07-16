import { AppRatingDialog } from "@/components/app/AppRatingDialog";
import { UpdateBanner } from "@/components/ui/update-banner";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <UpdateBanner />
      {children}
      <AppRatingDialog />
    </>
  );
}
