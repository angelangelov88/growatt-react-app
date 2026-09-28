import { Link } from "react-router";
import ContactLink from "./ContactLink";
import LegalPage from "./LegalPage";
import LegalSection from "./LegalSection";
import { OPERATOR, SITE } from "./legalInfo";

const TermsPage = () => (
  <LegalPage title="Terms of use">
    <p>
      These terms apply when you use Energy Dashboard ({SITE}). By creating an
      account or using the app, you agree to them. Please read them, in
      particular the parts about your inverter and our liability.
    </p>

    <LegalSection title="Who we are">
      <p>
        Energy Dashboard is a free, personal, non-commercial project run by{" "}
        {OPERATOR}. You can reach us at <ContactLink />. How we handle your data
        is explained in the{" "}
        <Link to="/privacy" className="text-violet-400 hover:underline">
          privacy notice
        </Link>
        .
      </p>
    </LegalSection>

    <LegalSection title="What the app does">
      <p>
        The app connects to your Growatt inverter and your Octopus Energy
        account. It shows your charge settings and Octopus&apos;s planned
        charging times, lets you change your inverter&apos;s charge and
        discharge schedules, lets you join Octopus saving sessions and, if you
        turn it on, updates your inverter&apos;s charge schedule automatically
        from your planned charging times.
      </p>
      <p>
        Energy Dashboard is independent. It isn&apos;t made, endorsed or
        supported by Growatt or Octopus Energy. It talks to Growatt the same way
        Growatt&apos;s own website does, not through an official interface, so
        it may stop working if Growatt changes its service.
      </p>
    </LegalSection>

    <LegalSection title="Using the app">
      <ul className="list-disc pl-5 flex flex-col gap-2">
        <li>You must be 18 or over.</li>
        <li>
          Only connect an inverter and an energy account that you own or are
          allowed to manage.
        </li>
        <li>
          Keep your login safe, and tell us straight away if you think someone
          else has used your account. We recommend turning on two-step
          verification in Settings.
        </li>
        <li>
          You&apos;re responsible for following Growatt&apos;s and Octopus
          Energy&apos;s own terms when you use your accounts with them through
          the app.
        </li>
        <li>
          Don&apos;t misuse the app: for example, don&apos;t try to reach other
          people&apos;s accounts or data, get around its security or limits,
          overload it, or create accounts automatically.
        </li>
      </ul>
    </LegalSection>

    <LegalSection title="Your inverter and energy account">
      <p>
        By connecting your accounts, you authorise the app to sign in to them
        for you and to read and change your inverter&apos;s settings. Changes
        are made when you press a button, or on a schedule if you turn on
        automatic charging, in which case they happen without asking you each
        time. You can turn automatic charging off, or remove your details, at
        any time in Settings.
      </p>
      <p>
        You stay responsible for your equipment, your settings and your energy
        use. Check that the settings the app applies suit you, and keep an eye
        on your system as you normally would. Nothing in the app is financial,
        electrical or energy advice.
      </p>
    </LegalSection>

    <LegalSection title="No guarantees">
      <p>
        The app is provided free, &quot;as is&quot; and &quot;as
        available&quot;. We work to keep it reliable and secure, but we
        can&apos;t promise it will always be available, free of errors, or that
        it will apply the right settings at the right time. Growatt or Octopus
        may be unavailable, may change their services, or may give the app wrong
        or late information, such as changed charging times.
      </p>
    </LegalSection>

    <LegalSection title="Our liability">
      <p>
        As far as the law allows, we aren&apos;t liable for any loss that comes
        from using, or not being able to use, the app. That includes higher
        energy bills, missed savings or saving sessions, battery or equipment
        wear or damage, and settings that were applied, applied late or not
        applied.
      </p>
      <p>
        Nothing in these terms limits liability for death or personal injury
        caused by negligence, for fraud, or for anything else the law
        doesn&apos;t allow to be limited, and nothing affects your legal rights
        as a consumer.
      </p>
    </LegalSection>

    <LegalSection title="Ending your use">
      <p>
        You can stop using the app at any time and delete your account in
        Settings. We may suspend or close an account that breaks these terms or
        puts the app or other users at risk. We may also change or close the
        app; if we close it, we&apos;ll try to give you notice by email first.
      </p>
    </LegalSection>

    <LegalSection title="Changes to these terms">
      <p>
        We may update these terms. The date at the top shows when they last
        changed. If a change is significant, we&apos;ll email you before it
        takes effect. If you keep using the app after that, the new terms apply.
      </p>
    </LegalSection>

    <LegalSection title="Law">
      <p>
        These terms are governed by the law of England and Wales, and disputes
        go to its courts. If you live in Scotland or Northern Ireland, you can
        also bring a claim in your local courts.
      </p>
    </LegalSection>
  </LegalPage>
);

export default TermsPage;
