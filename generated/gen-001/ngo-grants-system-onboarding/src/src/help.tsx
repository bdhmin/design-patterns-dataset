import { createContext, useContext, type ReactNode } from 'react';

export type HelpApi = {
  openTerm: (id: string, el: HTMLElement, extra?: { title: string; text: string }) => void;
  openGlossary: (id?: string) => void;
  openArticle: (title: string) => void;
  openHelpdesk: (subject?: string) => void;
};

export const HelpCtx = createContext<HelpApi>(null as unknown as HelpApi);
export const useHelp = () => useContext(HelpCtx);

/** An inline glossary term: dotted underline, click to explain. */
export function T({ id, children }: { id: string; children: ReactNode }) {
  const help = useHelp();
  return (
    <button type="button" className="term" onClick={(e) => help.openTerm(id, e.currentTarget)} aria-haspopup="dialog">
      {children}
    </button>
  );
}

export function ArticleLink({ title, children }: { title: string; children?: ReactNode }) {
  const help = useHelp();
  return (
    <button type="button" className="link" onClick={() => help.openArticle(title)}>
      {children ?? title}
    </button>
  );
}
