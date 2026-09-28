import Spinner from "../../components/Spinner";
import type { SubmitButtonProps } from "../../types/Auth";

const SubmitButton = ({
  label,
  pendingLabel,
  isPending,
}: SubmitButtonProps) => (
  <button
    type="submit"
    disabled={isPending}
    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400"
  >
    {isPending && <Spinner className="text-white" />}
    {isPending ? pendingLabel : label}
  </button>
);

export default SubmitButton;
