import { SocPlaybook } from "../../soc/playbooks/playbooks";

export default function PlaybookCard({
  playbook,
  reason,
}: {
  playbook: SocPlaybook;
  reason: string[];
}) {
  return (
    <div className="border border-[#1E2A45] rounded-lg p-4 bg-[#121A33]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-100">
            Playbook: {playbook.title}
          </h3>
          <p className="text-gray-400 mt-2">{playbook.description}</p>
        </div>

        <span className="px-2 py-1 text-xs rounded border border-[#1E2A45] text-gray-200">
          Severity: {playbook.severity}
        </span>
      </div>

      {reason?.length > 0 && (
        <div className="mt-4">
          <div className="text-sm text-gray-300 font-semibold">Why it matched</div>
          <ul className="mt-2 text-sm text-gray-400 space-y-1">
            {reason.map((r) => (
              <li key={r}>• {r}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-4">
        <div className="text-sm text-gray-300 font-semibold">Conditions</div>
        <ul className="mt-2 text-sm text-gray-400 space-y-1">
          {playbook.conditions.map((c) => (
            <li key={c}>• {c}</li>
          ))}
        </ul>
      </div>

      <div className="mt-4">
        <div className="text-sm text-gray-300 font-semibold">Recommended actions</div>
        <ul className="mt-2 text-sm text-gray-400 space-y-1">
          {playbook.recommended_actions.map((a) => (
            <li key={a}>• {a}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
