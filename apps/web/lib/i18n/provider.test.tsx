import React from "react";
import { renderToString } from "react-dom/server";
import { useTranslation } from "react-i18next";
import { describe, expect, it } from "vitest";

import CustomI18nextProvider from "./provider";

const resources = {
  en: { translation: { common: { note: "Note", search: "Search" } } },
  zh: { translation: { common: { note: "笔记" } } },
};

function Greeting() {
  const { t } = useTranslation();
  return <span>{`${t("common.note")} / ${t("common.search")}`}</span>;
}

function renderLanguage(lang: string) {
  return renderToString(
    <CustomI18nextProvider lang={lang} resources={resources}>
      <Greeting />
    </CustomI18nextProvider>,
  );
}

describe("translation rendering", () => {
  it("renders the requested language and fallback synchronously for SSR", () => {
    expect(renderLanguage("zh")).toBe("<span>笔记 / Search</span>");
  });

  it("isolates languages across server render trees", () => {
    expect(renderLanguage("zh")).toContain("笔记");
    expect(renderLanguage("en")).toContain("Note");
    expect(renderLanguage("zh")).toContain("笔记");
  });
});
