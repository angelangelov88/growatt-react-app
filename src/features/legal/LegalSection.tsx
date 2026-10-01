import type { LegalSectionProps } from "../../types/Legal";

const LegalSection = ({ title, children }: LegalSectionProps) => (
  <section className="flex flex-col gap-3">
    <h2 className="text-base font-semibold text-strong">{title}</h2>
    {children}
  </section>
);

export default LegalSection;
