import type { ReactNode } from 'react';

type LegalProps = { type: 'privacy' | 'terms' }

export default function Legal({ type }: LegalProps) {
  const privacy = type === 'privacy'
  return (
    <main className="min-h-screen text-white pt-36 pb-24 px-6">
      <article className="max-w-3xl mx-auto rounded-3xl border border-white/10 bg-white/5 p-8 md:p-12">
        <h1 className="text-3xl md:text-4xl font-semibold mb-3">{privacy ? 'Privacy Policy' : 'Terms of Service'}</h1>
        <p className="text-sm text-gray-400 mb-10">Effective September 20, 2026</p>
        {privacy ? <>
          <Section title="Information we process">We process account details, uploaded product and model images, prompts, generated content, credit usage, and technical information needed to operate and secure Aimakevision.</Section>
          <Section title="How we use information">We use this information to authenticate users, generate requested content, store project history, provide support, prevent abuse, and improve reliability.</Section>
          <Section title="Service providers">Aimakevision uses service providers for authentication, cloud hosting, databases, file storage, AI generation, error monitoring, and payments. They process information only to provide their services.</Section>
          <Section title="Your choices">You may request access, correction, or deletion of your personal information and projects by contacting ai@tyrveai.com.</Section>
          <Section title="Contact">Privacy questions may be sent to ai@tyrveai.com. Mailing address: 300 Biscayne Boulevard Way, Miami, FL 33131.</Section>
        </> : <>
          <Section title="Using Aimakevision">You must own or have permission to use every image, prompt, trademark, likeness, and other material you upload. Do not use the service for unlawful, deceptive, infringing, or harmful content.</Section>
          <Section title="Generated content">AI output can be inaccurate or unsuitable. You are responsible for reviewing output and confirming that you have the rights and approvals needed before publishing or using it commercially.</Section>
          <Section title="Credits and payments">Generation uses credits shown in the product. Paid plans, renewal terms, cancellation options, and applicable taxes are displayed before purchase. Completed AI generations may consume credits because processing costs are incurred.</Section>
          <Section title="Availability">We work to keep the service available but do not guarantee uninterrupted operation or specific business results.</Section>
          <Section title="Contact">Questions may be sent to ai@tyrveai.com. Mailing address: 300 Biscayne Boulevard Way, Miami, FL 33131.</Section>
        </>}
      </article>
    </main>
  )
}

function Section({ title, children }: { title: string, children: ReactNode }) {
  return <section className="mb-8"><h2 className="text-xl font-medium mb-3">{title}</h2><p className="text-gray-300 leading-7">{children}</p></section>
}