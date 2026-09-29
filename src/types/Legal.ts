import type { ReactNode } from "react";

// showUpdated: the "Last updated" date, for the privacy and terms pages.
type LegalPageProps = {
  title: string;
  children: ReactNode;
  showUpdated?: boolean;
};

type LegalSectionProps = { title: string; children: ReactNode };

type ContactLinkProps = { email?: string };

export type { LegalPageProps, LegalSectionProps, ContactLinkProps };
