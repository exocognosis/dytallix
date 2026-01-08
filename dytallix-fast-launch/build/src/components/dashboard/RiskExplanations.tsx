import React from 'react';
import { GlassPanel } from '../ui/GlassPanel';

const RiskExplanations: React.FC = () => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
            {/* HNDL Explanation */}
            <GlassPanel variant="card" hoverEffect={true} className="p-6">
                <div className="flex items-center space-x-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-foreground">HNDL: Harvest Now, Decrypt Later</h3>
                </div>
                <p className="text-muted-foreground text-sm leading-relaxed mb-4">
                    <strong className="text-foreground">The Threat:</strong> Adversaries are collecting encrypted data <em>today</em> that they cannot yet read. They store this data with the intention of decrypting it once a powerful quantum computer becomes available.
                </p>
                <p className="text-muted-foreground text-sm leading-relaxed">
                    <strong className="text-foreground">Why it matters:</strong> If your data has a long shelf-life (like health records, trade secrets, or government intelligence), it is already at risk. Even if you upgrade encryption later, the data stolen today will be exposed.
                </p>
            </GlassPanel>

            {/* CRQC Explanation */}
            <GlassPanel variant="card" hoverEffect={true} className="p-6">
                <div className="flex items-center space-x-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center text-destructive">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-foreground">CRQC: Cryptographically Relevant Quantum Computer</h3>
                </div>
                <p className="text-muted-foreground text-sm leading-relaxed mb-4">
                    <strong className="text-foreground">The Threat:</strong> A CRQC is a future quantum computer powerful enough to break standard public-key encryption (like RSA and ECC) used to secure nearly all digital communications and data.
                </p>
                <p className="text-muted-foreground text-sm leading-relaxed">
                    <strong className="text-foreground">Why it matters:</strong> Once a CRQC exists, any system relying on traditional encryption will be instantly vulnerable. This includes secure web browsing, digital signatures, and encrypted file storage.
                </p>
            </GlassPanel>
        </div>
    );
};

export default RiskExplanations;
