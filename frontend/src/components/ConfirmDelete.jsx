import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { errMsg } from "@/lib/api";

export const ConfirmDelete = ({ title = "Hapus data ini?", description, onConfirm, testid, label }) => {
  const run = async () => {
    try {
      await onConfirm();
    } catch (e) {
      toast.error(errMsg(e));
    }
  };
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <button
          data-testid={testid}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-sm text-muted-foreground transition-colors hover:bg-destructive/15 hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />{label}
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description && <AlertDialogDescription>{description}</AlertDialogDescription>}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel data-testid={`${testid}-cancel`}>Batal</AlertDialogCancel>
          <AlertDialogAction data-testid={`${testid}-confirm`} onClick={run} className="bg-destructive text-white hover:bg-destructive/90">
            Ya, lanjutkan
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
