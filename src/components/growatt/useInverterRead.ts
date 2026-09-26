import { useEffect, useRef, useState } from "react";
import type { UseQueryResult } from "@tanstack/react-query";
import { isSavedData } from "./useGrowatt";
import type { ChargePeriods } from "./growattApi";
import { sameSettings, type SlotForm } from "./useSlotForm";
import useToast from "../../contexts/useToast";

// A Read the user presses locks the card and always loads the result. Any other data
// change (values written to the cache after a save — from this card or the Octopus
// card — then the background read that checks them) is only loaded if it doesn't
// clash with unsaved edits.

const useInverterRead = (
  query: UseQueryResult<ChargePeriods>,
  form: SlotForm,
) => {
  const { showToast } = useToast();
  const [isReading, setIsReading] = useState(false);
  const userRead = useRef(false);
  const prevData = useRef<ChargePeriods | undefined>(undefined);
  const hasUnsavedChanges = form.isLoaded && form.isDirty;

  useEffect(() => {
    const data = query.data;
    const prev = prevData.current;
    // Only act on new data; the other dependencies change on every form edit.
    if (data === prev) return;
    prevData.current = data;
    if (!data) return;
    const isUserRead = userRead.current;
    userRead.current = false;
    if (isUserRead || form.matches(data)) {
      form.load(data);
      return;
    }
    // A real read following a save is the check of that save. If it agrees, nothing to do.
    const isSaveCheck = !!prev && isSavedData(prev) && !isSavedData(data);
    if (isSaveCheck && sameSettings(prev, data)) return;
    if (hasUnsavedChanges) {
      showToast(
        "Your inverter's settings have changed — press Load to see them (your edits are kept until then)",
        "info",
      );
      return;
    }
    form.load(data);
    if (isSaveCheck)
      showToast(
        "The inverter reports different settings to what was saved — showing the inverter's values",
        "error",
      );
  }, [query.data, form, hasUnsavedChanges, showToast]);

  useEffect(() => {
    if (!query.isError) return;
    userRead.current = false;
    showToast(`Couldn't load settings: ${query.error.message}`, "error");
  }, [query.isError, query.error, query.errorUpdatedAt, showToast]);

  // `confirmed` skips the prompt when the caller has already asked (Load all).
  const read = ({ confirmed = false }: { confirmed?: boolean } = {}) => {
    if (
      !confirmed &&
      hasUnsavedChanges &&
      !window.confirm(
        "You have unsaved changes. Load the settings from your inverter and discard them?",
      )
    )
      return;
    const before = query.data;
    userRead.current = true;
    setIsReading(true);
    void query
      .refetch({ cancelRefetch: false })
      .then((result) => {
        // Identical data keeps the same reference, so the effect above won't run — load it here.
        if (!result.isError && result.data && result.data === before) {
          userRead.current = false;
          form.load(result.data);
        }
      })
      .finally(() => {
        setIsReading(false);
      });
  };

  // Checks the inverter in the background without locking the card.
  const verify = () => {
    void query.refetch({ cancelRefetch: false });
  };

  return {
    read,
    verify,
    hasUnsavedChanges,
    isReading,
    isVerifying: query.isFetching && !isReading,
  };
};

type InverterRead = ReturnType<typeof useInverterRead>;

export type { InverterRead };
export default useInverterRead;
