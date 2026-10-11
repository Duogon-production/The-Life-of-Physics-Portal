/** Preserve the copied interface without enabling an unsupported backend workflow. */
export function CapabilityGate({ reason, children }: { reason: string; children: React.ReactNode }) {
  return <div>
    <p role="status" className="mb-2 text-xs text-amber-800">Awaiting backend integration: {reason}</p>
    <fieldset disabled aria-label={reason}><div {...{ inert: '' }}>{children}</div></fieldset>
  </div>;
}
