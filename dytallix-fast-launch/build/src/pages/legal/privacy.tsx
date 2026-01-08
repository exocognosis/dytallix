import { Section } from "../../components/ui/Section"
import { GlassPanel } from "../../components/ui/GlassPanel"

export function Privacy() {
    return (
        <Section title="Privacy Policy" subtitle="Last updated: December 2025" centered={false}>
            <GlassPanel className="p-8 md:p-12 prose dark:prose-invert max-w-none">
                <h3>1. Introduction</h3>
                <p>
                    Dytallix ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website and use our services.
                </p>

                <h3>2. Information We Collect</h3>
                <p>
                    We may collect information about you in a variety of ways. The information we may collect on the Site includes:
                </p>
                <ul>
                    <li><strong>Personal Data:</strong> Personally identifiable information, such as your name, shipping address, email address, and telephone number.</li>
                    <li><strong>Derivative Data:</strong> Information our servers automatically collect when you access the Site, such as your IP address, your browser type, your operating system, your access times, and the pages you have viewed directly before and after accessing the Site.</li>
                </ul>

                <h3>3. Use of Your Information</h3>
                <p>
                    Having accurate information about you permits us to provide you with a smooth, efficient, and customized experience. Specifically, we may use information collected about you via the Site to:
                </p>
                <ul>
                    <li>Create and manage your account.</li>
                    <li>Email you regarding your account or order.</li>
                    <li>Fulfill and manage purchases, orders, payments, and other transactions related to the Site.</li>
                </ul>

                <h3>4. Disclosure of Your Information</h3>
                <p>
                    We may share information we have collected about you in certain situations. Your information may be disclosed as follows:
                </p>
                <ul>
                    <li><strong>By Law or to Protect Rights:</strong> If we believe the release of information about you is necessary to respond to legal process, to investigate or remedy potential violations of our policies, or to protect the rights, property, and safety of others, we may share your information as permitted or required by any applicable law, rule, or regulation.</li>
                </ul>

                <h3>5. Contact Us</h3>
                <p>
                    If you have questions or comments about this Privacy Policy, please contact us at privacy@dytallix.com.
                </p>
            </GlassPanel>
        </Section>
    )
}
