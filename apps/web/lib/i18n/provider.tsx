import type { Resource } from "i18next";
import { useMemo } from "react";
import { createInstance } from "i18next";
import { I18nextProvider } from "react-i18next";

import { getOptions } from "./settings";

export default function CustomI18nextProvider({
  lang,
  resources,
  children,
}: {
  lang: string;
  resources: Resource;
  children: React.ReactNode;
}) {
  // Each render tree gets its own language instance. Resources arrive with the
  // server payload so the first client render matches SSR without an async switch.
  const instance = useMemo(() => {
    const next = createInstance();
    next.init({
      ...getOptions(lang),
      resources,
      initImmediate: false,
      interpolation: { escapeValue: false },
    });
    return next;
  }, [lang, resources]);
  return <I18nextProvider i18n={instance}>{children}</I18nextProvider>;
}
