'use client';

// ============================================================
// Ward — EIP-712 Sign Typed Data Sheet
// ============================================================
// Bottom sheet for signing typed structured data, rendered
// human-readably. Demo payload showcases the signing flow.

import { useState } from 'react';
import { useWalletStore } from '@/store/wallet';
import { mnemonicToSeed, deriveAccount, signTypedData } from '@/layers/key';
import { Sheet, Button, Icon } from '@/components/ui';
import { shortAddress } from '@/lib/format';

interface SignTypedDataSheetProps {
  open: boolean;
  onClose: () => void;
}

export function SignTypedDataSheet({ open, onClose }: SignTypedDataSheetProps) {
  const { accounts, activeAccountIndex, mnemonic, activeChain } = useWalletStore();
  const account = accounts[activeAccountIndex];

  const [typedData] = useState(() => ({
    domain: {
      name: 'Ward Demo',
      version: '1',
      chainId: activeChain.id,
      verifyingContract: '0x0000000000000000000000000000000000000000' as const,
    },
    types: {
      EIP712Domain: [
        { name: 'name', type: 'string' },
        { name: 'version', type: 'string' },
        { name: 'chainId', type: 'uint256' },
        { name: 'verifyingContract', type: 'address' },
      ],
      Person: [
        { name: 'name', type: 'string' },
        { name: 'wallet', type: 'address' },
      ],
      Mail: [
        { name: 'from', type: 'Person' },
        { name: 'to', type: 'Person' },
        { name: 'contents', type: 'string' },
      ],
    } as const,
    primaryType: 'Mail' as const,
    message: {
      from: { name: 'Alice', wallet: account?.address ?? '0x0000000000000000000000000000000000000000' },
      to: { name: 'Bob', wallet: '0x0000000000000000000000000000000000000000' },
      contents: 'Hello, Ward!',
    },
  }));

  const [status, setStatus] = useState<'idle' | 'signing' | 'signed' | 'error'>('idle');
  const [signature, setSignature] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    onClose();
    // Reset after the exit animation.
    setTimeout(() => { setStatus('idle'); setSignature(null); setError(null); }, 250);
  };

  const handleSign = async () => {
    if (!mnemonic || !account) return;
    setStatus('signing');
    setError(null);
    try {
      const seed = mnemonicToSeed(mnemonic);
      const signer = deriveAccount(seed, account.index);
      const sig = await signTypedData(signer, typedData as Parameters<typeof signTypedData>[1]);
      setSignature(sig);
      setStatus('signed');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Signing failed');
      setStatus('error');
    }
  };

  return (
    <Sheet open={open} onClose={close} title="Sign message" subtitle="EIP-712 typed data signature" dismissible={status !== 'signing'}>
      <div className="px-6 pb-8 pt-2">
        {status === 'signed' && signature ? (
          <div className="text-center py-4">
            <div className="w-12 h-12 rounded-full bg-success-subtle text-success flex items-center justify-center mx-auto mb-3">
              <Icon name="check" size={24} />
            </div>
            <p className="text-sm font-medium text-text mb-3">Message signed</p>
            <p className="text-xs font-mono text-text-secondary break-all bg-surface rounded-[var(--radius-md)] p-3 border border-border">
              {signature}
            </p>
            <Button fullWidth onClick={close} className="mt-6">Done</Button>
          </div>
        ) : (
          <>
            <Group title="Domain">
              <KV label="Name" value={typedData.domain.name} />
              <KV label="Version" value={typedData.domain.version} />
              <KV label="Chain ID" value={String(typedData.domain.chainId)} />
              <KV label="Contract" value={shortAddress(typedData.domain.verifyingContract, 8, 6)} mono />
            </Group>

            <Group title="Message">
              <Person label="From" name={typedData.message.from.name} wallet={typedData.message.from.wallet} />
              <div className="border-t border-border my-2" />
              <Person label="To" name={typedData.message.to.name} wallet={typedData.message.to.wallet} />
              <div className="border-t border-border my-2" />
              <div>
                <div className="text-xs text-text-tertiary">Contents</div>
                <div className="text-sm text-text mt-0.5">{typedData.message.contents}</div>
              </div>
            </Group>

            {error && <p className="text-sm text-danger mb-4 text-center">{error}</p>}

            <div className="flex gap-3">
              <Button variant="secondary" fullWidth disabled={status === 'signing'} onClick={close}>Cancel</Button>
              <Button fullWidth loading={status === 'signing'} onClick={handleSign}>
                {status === 'error' ? 'Try again' : 'Sign'}
              </Button>
            </div>
          </>
        )}
      </div>
    </Sheet>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <h3 className="text-xs text-text-tertiary uppercase tracking-wider mb-2">{title}</h3>
      <div className="card p-4 space-y-2">{children}</div>
    </div>
  );
}

function KV({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-text-tertiary">{label}</span>
      <span className={`text-xs text-right ${mono ? 'font-mono text-text-secondary' : 'text-text'}`}>{value}</span>
    </div>
  );
}

function Person({ label, name, wallet }: { label: string; name: string; wallet: string }) {
  return (
    <div>
      <div className="text-xs text-text-tertiary">{label}</div>
      <div className="text-sm text-text mt-0.5">{name}</div>
      <div className="text-xs text-text-secondary font-mono mt-0.5">{shortAddress(wallet, 10, 6)}</div>
    </div>
  );
}
