import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { ErrorCallout } from "./components/ErrorCallout";
import { PopupHeader } from "./components/PopupHeader";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import usePluginSettings from "./utils/settings";
import { isHttpUrl } from "./utils/url";

export default function ServerAddressPage() {
  const navigate = useNavigate();
  const { settings, setSettings } = usePluginSettings();

  const [error, setError] = useState("");
  const [serverAddress, setServerAddress] = useState(settings.address);

  useEffect(() => {
    setServerAddress(settings.address);
  }, [settings.address]);

  // Convert headers object to array of entries for easier manipulation
  const [headers, setHeaders] = useState<{ key: string; value: string }[]>([]);
  const [newHeaderKey, setNewHeaderKey] = useState("");
  const [newHeaderValue, setNewHeaderValue] = useState("");

  // Update headers when settings change (e.g., when loaded from storage)
  useEffect(() => {
    setHeaders(
      Object.entries(settings.customHeaders || {}).map(([key, value]) => ({
        key,
        value,
      })),
    );
  }, [settings.customHeaders]);

  const handleAddHeader = () => {
    if (!newHeaderKey.trim() || !newHeaderValue.trim()) {
      return;
    }

    // Check if header already exists
    const existingIndex = headers.findIndex((h) => h.key === newHeaderKey);
    if (existingIndex >= 0) {
      // Update existing header
      const updatedHeaders = [...headers];
      updatedHeaders[existingIndex].value = newHeaderValue;
      setHeaders(updatedHeaders);
    } else {
      // Add new header
      setHeaders([...headers, { key: newHeaderKey, value: newHeaderValue }]);
    }

    setNewHeaderKey("");
    setNewHeaderValue("");
  };

  const handleRemoveHeader = (index: number) => {
    setHeaders(headers.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    const address = serverAddress.trim();
    if (address == "") {
      setError("请输入服务器地址");
      return;
    }

    if (!isHttpUrl(address)) {
      setError("服务器地址必须以 http:// 或 https:// 开头");
      return;
    }

    // Convert array back to object
    const headersObject = headers.reduce(
      (acc, { key, value }) => {
        if (key.trim() && value.trim()) {
          acc[key] = value;
        }
        return acc;
      },
      {} as Record<string, string>,
    );

    await setSettings((s) => ({
      ...s,
      ...(s.address !== address.replace(/\/$/, "")
        ? { apiKey: "", apiKeyId: undefined }
        : {}),
      address: address.replace(/\/$/, ""),
      customHeaders: headersObject,
    }));
    navigate(-1);
  };

  const handleCancel = () => {
    navigate(-1);
  };

  return (
    <div className="flex flex-col gap-5">
      <PopupHeader title="服务器" onBack={handleCancel} />

      {error && <ErrorCallout>{error}</ErrorCallout>}

      <section className="flex flex-col gap-1.5">
        <label htmlFor="address" className="text-sm font-medium">
          服务器地址
        </label>
        <Input
          id="address"
          name="address"
          value={serverAddress}
          placeholder="https://keeply.facezero.online"
          autoComplete="url"
          autoFocus
          onChange={(e) => {
            setServerAddress(e.target.value);
            setError("");
          }}
        />
        <p className="text-xs text-muted-foreground">
          默认连接 keeply.facezero.online，也可填写其他自托管服务器地址。
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-sm font-medium">
            自定义请求头
            {headers.length > 0 && (
              <span className="font-normal text-muted-foreground">
                {" "}
                ({headers.length})
              </span>
            )}
          </h2>
          <p className="text-xs text-muted-foreground">
            随每次请求发送，适用于需要额外身份验证的代理。
          </p>
        </div>

        {headers.length > 0 && (
          <div className="flex max-h-48 flex-col divide-y overflow-y-auto rounded-lg border bg-card">
            {headers.map((header, index) => (
              <div
                key={index}
                className="flex items-center gap-2 py-2 pl-3 pr-1.5"
              >
                <div className="flex min-w-0 flex-1 flex-col">
                  <p className="truncate font-mono text-xs font-semibold">
                    {header.key}
                  </p>
                  <p className="truncate font-mono text-xs text-muted-foreground">
                    {header.value}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveHeader(index)}
                  className="size-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  aria-label={`删除 ${header.key}`}
                  title="删除请求头"
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            handleAddHeader();
          }}
        >
          <Input
            placeholder="名称"
            aria-label="请求头名称"
            value={newHeaderKey}
            onChange={(e) => setNewHeaderKey(e.target.value)}
            autoCapitalize="none"
            className="h-9 min-w-0 font-mono text-xs"
          />
          <Input
            placeholder="内容"
            aria-label="请求头内容"
            value={newHeaderValue}
            onChange={(e) => setNewHeaderValue(e.target.value)}
            autoCapitalize="none"
            className="h-9 min-w-0 font-mono text-xs"
          />
          <Button
            type="submit"
            variant="secondary"
            size="icon"
            disabled={!newHeaderKey.trim() || !newHeaderValue.trim()}
            className="size-9 shrink-0"
            aria-label="添加请求头"
            title="添加请求头"
          >
            <Plus className="size-4" />
          </Button>
        </form>
      </section>

      {/* Action Buttons */}
      <div className="-mx-4 -mb-4 flex gap-2 border-t p-4">
        <Button variant="outline" onClick={handleCancel} className="flex-1">
          取消
        </Button>
        <Button onClick={handleSave} className="flex-1">
          保存
        </Button>
      </div>
    </div>
  );
}
