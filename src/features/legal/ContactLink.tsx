import { CONTACT_EMAIL } from "./legalInfo";

const ContactLink = () => (
  <a
    href={`mailto:${CONTACT_EMAIL}`}
    className="text-violet-400 hover:underline"
  >
    {CONTACT_EMAIL}
  </a>
);

export default ContactLink;
