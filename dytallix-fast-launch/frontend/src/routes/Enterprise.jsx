import React from 'react';

/**
 * Enterprise Page - QuantumVault for Organizations
 * Target audience: Organizations and enterprises seeking quantum-safe data protection
 */
const Enterprise = () => {
  const threatSignals = [
    {
      title: 'Harvest now, decrypt later is accelerating',
      detail: 'Nation-state actors are warehousing encrypted records today. QuantumVault rotates keys and re-protects legacy archives with PQC before that data window opens.'
    },
    {
      title: 'Regulators are updating mandates',
      detail: 'FFIEC, ENISA, and CSA updates require quantum transition plans. QuantumVault produces audit-ready reports aligned to these frameworks.'
    },
    {
      title: 'Crown-jewel data needs zero trust',
      detail: 'Hardware enclaves and policy engines enforce least privilege across jurisdictions with continuous anomaly scoring.'
    }
  ];

  const architectureLayers = [
    {
      name: 'PQC Core',
      description: 'ML-DSA (Dilithium) / SLH-DSA (SPHINCS+) signing, ML-KEM (Kyber) key encapsulation, and crypto-agile key rotation orchestrated through HSM connectors.',
      color: 'from-purple-500/10'
    },
    {
      name: 'Policy Orchestration',
      description: 'Dynamic access workflows map to classifications, retention schedules, and compliance attestations.',
      color: 'from-blue-500/10'
    },
    {
      name: 'Threat Intelligence',
      description: 'On-chain AI models detect anomalous access, unusual partner requests, and potential data ex-filtration in real time.',
      color: 'from-red-500/10'
    },
    {
      name: 'Evidence Engine',
      description: 'Immutable logging and tamper-evident reports tie every action back to owners for audits and board briefings.',
      color: 'from-green-500/10'
    }
  ];

  const valueStack = [
    {
      headline: 'Protect future revenues',
      copy: 'Keep customer trust and avoid breach remediation costs by securing records before quantum adversaries can expose them.',
      color: 'from-green-500/10'
    },
    {
      headline: 'Reduce audit fatigue',
      copy: 'Generate pre-built evidence packs for FFIEC, GDPR, and NIST reviews with one-click exports and chain-of-custody trails.',
      color: 'from-blue-500/10'
    },
    {
      headline: 'Accelerate modernization',
      copy: 'Use QuantumVault adapters to modernize encryption without re-platforming critical workloads or delaying cloud migrations.',
      color: 'from-purple-500/10'
    }
  ];

  const industries = [
    { name: 'Financial Services', focus: 'Protect trade logs, settlement instructions, and cross-border payment archives.', color: 'from-blue-500/10' },
    { name: 'Healthcare & Life Sciences', focus: 'Shield genomic research, patient data, and telehealth workflows from future compromise.', color: 'from-green-500/10' },
    { name: 'Public Sector', focus: 'Safeguard citizen services, diplomatic cables, and classified archives across regions.', color: 'from-red-500/10' },
    { name: 'Energy & Critical Infrastructure', focus: 'Secure SCADA telemetry, predictive maintenance, and grid analytics.', color: 'from-yellow-500/10' },
    { name: 'Telecommunications', focus: 'Defend subscriber metadata, roaming agreements, and 6G R&D.', color: 'from-purple-500/10' },
    { name: 'Technology & SaaS', focus: 'Protect AI training data, IP, and customer vaults without slowing release cycles.', color: 'from-cyan-500/10' }
  ];

  const roadmap = [
    {
      step: '1. Quantum readiness workshop',
      detail: 'Assess cryptographic inventory, identify PQC migration priorities, and align stakeholders on sequencing.'
    },
    {
      step: '2. Pilot enclave & policy mapping',
      detail: 'Activate QuantumVault vaults for crown-jewel datasets and integrate existing identity providers and HSMs.'
    },
    {
      step: '3. Enterprise rollout',
      detail: 'Expand coverage to additional business units with automated rotation schedules and AI-driven anomaly scoring.'
    },
    {
      step: '4. Continuous assurance',
      detail: 'Generate evidence packs, track new standards, and iterate with the Dytallix Build ecosystem.'
    }
  ];

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 antialiased">
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top,rgba(139,92,246,0.15),transparent_60%)]"/>
      
      <main className="relative max-w-7xl mx-auto px-4 md:px-6 lg:px-8 pt-28 pb-24">
        {/* Hero Section */}
        <section className="relative pt-6 pb-12">
          <div className="grid md:grid-cols-2 gap-10 items-center">
            <div>
              <p className="text-sm font-semibold text-purple-400 uppercase tracking-wide">Enterprise Protection</p>
              <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight mt-3">
                Defend Your Future Data — Before Quantum Decryption Begins.
              </h1>
              <p className="mt-6 text-xl text-neutral-300">
                QuantumVault helps CISOs harden archives, active workloads, and compliance operations with post-quantum controls that deploy in weeks, not quarters.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <a 
                  href="mailto:hello@dytallix.com?subject=QuantumVault%20Demo" 
                  className="px-6 py-3 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-semibold transition shadow-lg shadow-purple-500/30"
                >
                  Request Demo
                </a>
                <a 
                  href="#/docs" 
                  className="px-6 py-3 rounded-2xl border border-white/20 hover:border-white/40 transition"
                >
                  Read Documentation
                </a>
              </div>
            </div>
            
            <div className="md:justify-self-end">
              <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-purple-500/10 to-transparent p-8 shadow-2xl">
                <h3 className="text-2xl font-bold mb-6">Why Act Now?</h3>
                <div className="space-y-4">
                  {threatSignals.map((signal, idx) => (
                    <div key={idx} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <h4 className="font-semibold text-purple-300 mb-2">{signal.title}</h4>
                      <p className="text-sm text-neutral-400">{signal.detail}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Architecture Section */}
        <section className="py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">QuantumVault Architecture</h2>
            <p className="mt-4 text-neutral-400 max-w-3xl mx-auto">
              Built on standardized post-quantum cryptography, QuantumVault provides enterprise-grade data protection with comprehensive policy controls.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6">
            {architectureLayers.map((layer, idx) => (
              <div 
                key={idx} 
                className={`rounded-2xl border border-white/10 bg-gradient-to-br ${layer.color} to-transparent p-6 hover:border-white/20 transition`}
              >
                <h3 className="text-xl font-semibold mb-3">{layer.name}</h3>
                <p className="text-neutral-300">{layer.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Value Proposition */}
        <section className="py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">Business Value</h2>
            <p className="mt-4 text-neutral-400 max-w-3xl mx-auto">
              QuantumVault delivers immediate and long-term value to your organization.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            {valueStack.map((value, idx) => (
              <div 
                key={idx} 
                className={`rounded-2xl border border-white/10 bg-gradient-to-br ${value.color} to-transparent p-6 hover:border-white/20 transition`}
              >
                <h3 className="text-xl font-semibold mb-3 text-white">{value.headline}</h3>
                <p className="text-neutral-300">{value.copy}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Industries */}
        <section className="py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">Industries We Serve</h2>
            <p className="mt-4 text-neutral-400 max-w-3xl mx-auto">
              QuantumVault adapts to the unique security requirements of regulated and high-risk industries.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {industries.map((industry, idx) => (
              <div 
                key={idx} 
                className={`rounded-2xl border border-white/10 bg-gradient-to-br ${industry.color} to-transparent p-6 hover:border-white/20 transition`}
              >
                <h3 className="text-lg font-semibold mb-2 text-white">{industry.name}</h3>
                <p className="text-sm text-neutral-300">{industry.focus}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Implementation Roadmap */}
        <section className="py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">Implementation Roadmap</h2>
            <p className="mt-4 text-neutral-400 max-w-3xl mx-auto">
              A proven path from assessment to continuous quantum protection.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6">
            {roadmap.map((phase, idx) => (
              <div 
                key={idx} 
                className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-transparent p-6 hover:border-white/20 transition"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-2xl font-bold text-purple-400">{idx + 1}</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold mb-2 text-white">{phase.step}</h3>
                    <p className="text-sm text-neutral-300">{phase.detail}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16">
          <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-purple-500/10 via-blue-500/10 to-transparent p-12 text-center">
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4">
              Ready to Secure Your Organization?
            </h2>
            <p className="text-xl text-neutral-300 mb-8 max-w-2xl mx-auto">
              Schedule a consultation with our quantum security experts to assess your readiness and plan your transition to post-quantum cryptography.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <a 
                href="mailto:hello@dytallix.com?subject=QuantumVault%20Enterprise%20Consultation" 
                className="px-8 py-4 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-semibold transition shadow-lg shadow-purple-500/30 text-lg"
              >
                Schedule Consultation
              </a>
              <a 
                href="#/quantumvault" 
                className="px-8 py-4 rounded-2xl border border-white/20 hover:border-white/40 transition text-lg font-semibold"
              >
                Try QuantumVault Demo
              </a>
            </div>
            <div className="mt-8 text-sm text-neutral-500">
              Trusted by financial institutions, healthcare providers, and critical infrastructure operators worldwide.
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Enterprise;
