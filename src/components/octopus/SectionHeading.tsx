import type { SectionHeadingProps } from "../../types/Octopus";

const SectionHeading = ({ children }: SectionHeadingProps) => (
  <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
    {children}
  </h3>
);

export default SectionHeading;
