import { Link } from "react-router";
import ContactLink from "../legal/ContactLink";
import LegalPage from "../legal/LegalPage";
import { HELLO_EMAIL } from "../legal/legalInfo";

// Just an email address: no form, so nothing to spam and no data to keep.
const ContactPage = () => (
  <LegalPage title="Contact" showUpdated={false}>
    <p>
      Questions, ideas, or something not working? Email me at{" "}
      <ContactLink email={HELLO_EMAIL} /> and I&apos;ll get back to you within a
      few days. It&apos;s a personal project, so replies aren&apos;t instant.
    </p>
    <ul className="list-disc pl-5 flex flex-col gap-2">
      <li>
        <strong className="text-gray-100">Reporting a problem:</strong> tell me
        what you were doing and roughly when it happened. Never send your
        passwords or API keys, because I&apos;ll never need them.
      </li>
      <li>
        <strong className="text-gray-100">Security issues:</strong> please email
        rather than posting publicly.
      </li>
      <li>
        <strong className="text-gray-100">Your data:</strong> you can download
        or delete it yourself in Settings. For anything else, see the{" "}
        <Link to="/privacy" className="text-violet-400 hover:underline">
          privacy notice
        </Link>
        .
      </li>
      <li>
        <strong className="text-gray-100">Beta full?</strong> Email me and
        I&apos;ll let you know when there&apos;s space.
      </li>
    </ul>
  </LegalPage>
);

export default ContactPage;
