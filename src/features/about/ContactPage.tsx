import { Link } from "react-router";
import { HELLO_EMAIL, ISSUES_URL } from "../../lib/contactInfo";
import ContactLink from "../legal/ContactLink";
import LegalPage from "../legal/LegalPage";
import LegalSection from "../legal/LegalSection";
import ContactForm from "./ContactForm";

const ContactPage = () => (
  <LegalPage title="Contact" showUpdated={false}>
    <p>
      Questions, ideas, or something not working? Send me a message and
      I&apos;ll reply by email within a few days. It&apos;s a personal project,
      so replies aren&apos;t instant.
    </p>
    <ContactForm />
    <LegalSection title="Other ways">
      <ul className="list-disc pl-5 flex flex-col gap-2">
        <li>
          <strong className="text-gray-100">GitHub:</strong> if it&apos;s
          easier, report a bug or suggest an idea as an{" "}
          <a
            href={ISSUES_URL}
            target="_blank"
            rel="noreferrer"
            className="text-violet-400 hover:underline"
          >
            issue on GitHub
          </a>
          . Issues are public, so don&apos;t include your email address,
          passwords or API keys.
        </li>
        <li>
          <strong className="text-gray-100">Email:</strong>{" "}
          <ContactLink email={HELLO_EMAIL} />.
        </li>
      </ul>
    </LegalSection>
    <LegalSection title="Good to know">
      <ul className="list-disc pl-5 flex flex-col gap-2">
        <li>
          <strong className="text-gray-100">Reporting a problem:</strong> tell
          me what you were doing and roughly when it happened.
        </li>
        <li>
          <strong className="text-gray-100">Security issues:</strong> use the
          form or email, never a public GitHub issue.
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
          <strong className="text-gray-100">Beta full?</strong> Send me a
          message and I&apos;ll let you know when there&apos;s space.
        </li>
      </ul>
    </LegalSection>
  </LegalPage>
);

export default ContactPage;
