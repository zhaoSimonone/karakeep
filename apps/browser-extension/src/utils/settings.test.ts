import { beforeEach, expect, it, vi } from "vitest";

const storage = vi.hoisted(() => ({
  get: vi.fn(),
  set: vi.fn(),
  onChanged: { addListener: vi.fn(), removeListener: vi.fn() },
}));
vi.stubGlobal("chrome", { storage: { sync: storage } });
const { getPluginSettings } = await import("./settings");
beforeEach(() => vi.clearAllMocks());
it("defaults new installations to Keeply with snapshots enabled", async () => {
  storage.get.mockResolvedValue({});
  expect(await getPluginSettings()).toMatchObject({
    address: "https://keeply.facezero.online",
    apiKey: "",
    useSingleFile: true,
    singleFileArticleOnly: true,
  });
});
it("migrates an unused stock address without proxy credentials", async () => {
  storage.get.mockResolvedValue({
    settings: {
      apiKey: "",
      address: "https://cloud.karakeep.app",
      customHeaders: { "X-Auth": "old" },
    },
  });
  expect(await getPluginSettings()).toMatchObject({
    address: "https://keeply.facezero.online",
    customHeaders: {},
  });
  expect(storage.set).toHaveBeenCalledOnce();
});
it("preserves an authenticated server and explicit snapshot preference", async () => {
  storage.get.mockResolvedValue({
    settings: {
      apiKey: "existing",
      address: "https://cloud.karakeep.app",
      useSingleFile: false,
    },
  });
  expect(await getPluginSettings()).toMatchObject({
    address: "https://cloud.karakeep.app",
    apiKey: "existing",
    useSingleFile: false,
  });
  expect(storage.set).not.toHaveBeenCalled();
});
it("preserves a custom self-hosted address", async () => {
  storage.get.mockResolvedValue({
    settings: { apiKey: "", address: "https://custom.example" },
  });
  expect((await getPluginSettings()).address).toBe("https://custom.example");
});

it("defaults an existing install to article-only capture without altering image preferences", async () => {
  storage.get.mockResolvedValue({
    settings: {
      apiKey: "existing",
      useSingleFile: true,
      singleFileIncludeImages: false,
    },
  });
  expect(await getPluginSettings()).toMatchObject({
    singleFileArticleOnly: true,
    singleFileIncludeImages: false,
  });
});
it("preserves the user's full-page fallback preference", async () => {
  storage.get.mockResolvedValue({
    settings: { apiKey: "existing", singleFileArticleOnly: false },
  });
  expect((await getPluginSettings()).singleFileArticleOnly).toBe(false);
});
