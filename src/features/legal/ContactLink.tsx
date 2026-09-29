import type { ContactLinkProps } from "../../types/Legal";
import { CONTACT_EMAIL } from "./legalInfo";

// A mailto link. The privacy address unless another is given.
const ContactLink = ({ email = CONTACT_EMAIL }: ContactLinkProps) => (
  <a href={`mailto:${email}`} className="text-violet-400 hover:underline">
    {email}
  </a>
);

export default ContactLink;
