import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

// Repository coordinates — the actual Greens ACC production repo
const GITHUB_OWNER = 'altrmaze';
const GITHUB_REPO  = 'greens-acc.com';

// Codespaces embed URL (requires the repo to have Codespaces enabled)
const CODESPACE_URL =
  `https://github.com/codespaces/embed/${GITHUB_OWNER}/${GITHUB_REPO}` +
  `?hide_repo_header=true&theme=dark`;

/**
 * CodeSpaceConsole
 *
 * Renders an embedded GitHub Codespaces terminal iframe, gated behind
 * software_engineer or admin clearance.  The Supabase `profiles` table
 * is queried to verify the authenticated user's role before mounting the frame.
 */
export function CodeSpaceConsole() {
  const [hasClearance, setHasClearance] = useState(false);
  const [loading, setLoading]           = useState(true);

  useEffect(() => {
    async function verifyDeveloperSession() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        if (data?.role === 'software_engineer' || data?.role === 'admin') {
          setHasClearance(true);
        }
      }
      setLoading(false);
    }
    verifyDeveloperSession();
  }, []);

  if (loading) {
    return (
      <div className="p-6 text-gray-500 font-mono text-sm animate-pulse">
        Booting Development Toolchains…
      </div>
    );
  }

  if (!hasClearance) {
    return (
      <div className="p-8 text-red-500 font-bold font-mono text-sm">
        CRITICAL: SECURITY BOUNDARY ERROR — INSUFFICIENT PERMISSIONS
      </div>
    );
  }

  return (
    <div
      className="w-full bg-[#181818] rounded-xl overflow-hidden border border-gray-800
        flex flex-col shadow-2xl"
      style={{ height: 'calc(100vh - 140px)' }}
    >
      {/* Terminal title bar */}
      <div
        className="bg-[#202020] px-4 py-2 text-xs text-gray-400 flex justify-between
          items-center border-b border-gray-900 font-mono"
      >
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
          <span className="font-semibold text-gray-300">
            EMBEDDED CODESPACE HUB: greens-acc.com
          </span>
        </div>
        <span className="text-gray-500 text-[10px]">BRANCH: main</span>
      </div>

      {/* Codespaces iframe */}
      <iframe
        src={CODESPACE_URL}
        title="Integrated Development Terminal Frame"
        className="w-full flex-grow bg-[#1e1e1e]"
        allow="clipboard-read; clipboard-write; encrypted-media;"
        sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-downloads"
      />
    </div>
  );
}
