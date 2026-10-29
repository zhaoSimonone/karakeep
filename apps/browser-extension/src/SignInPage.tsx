import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Server } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { ErrorCallout } from "./components/ErrorCallout";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import Logo from "./Logo";
import Spinner from "./Spinner";
import usePluginSettings from "./utils/settings";
import { useTRPC } from "./utils/trpc";

const enum LoginType {
  Password = "PASSWORD",
  ApiKey = "API_KEY",
}

const CONNECTION_ERROR_MESSAGE =
  "无法连接收好服务器，请检查服务器地址和网络后重试。";

function getLoginErrorMessage(
  error: { data?: { code?: string } | null; message: string },
  unauthorizedMessage: string,
) {
  if (error.data?.code === "UNAUTHORIZED") {
    return unauthorizedMessage;
  }

  // Chrome reports "Failed to fetch", Firefox "NetworkError when attempting
  // to fetch resource."
  if (error.message.toLowerCase().includes("fetch")) {
    return CONNECTION_ERROR_MESSAGE;
  }

  return error.message;
}

export default function SignInPage() {
  const api = useTRPC();
  const navigate = useNavigate();
  const { settings, setSettings } = usePluginSettings();
  const [error, setError] = useState<string | undefined>();
  const [loginType, setLoginType] = useState<LoginType>(LoginType.Password);

  const [formData, setFormData] = useState({ email: "", password: "" });
  const [apiKey, setApiKey] = useState("");

  const { mutate: login, isPending: userNamePasswordRequestIsPending } =
    useMutation(
      api.apiKeys.exchange.mutationOptions({
        onSuccess: async (resp) => {
          await setSettings((s) => ({
            ...s,
            apiKey: resp.key,
            apiKeyId: resp.id,
          }));
          navigate("/options");
        },
        onError: (e) => {
          setError(getLoginErrorMessage(e, "邮箱或密码不正确。"));
        },
      }),
    );

  const { mutate: validateApiKey, isPending: apiKeyValueRequestIsPending } =
    useMutation(
      api.apiKeys.validate.mutationOptions({
        onSuccess: async (_resp, req) => {
          // Store exactly the key that was validated, not the live input.
          await setSettings((s) => ({ ...s, apiKey: req.apiKey }));
          navigate("/options");
        },
        onError: (e) => {
          setError(getLoginErrorMessage(e, "API 密钥无效。"));
        },
      }),
    );

  const isPending =
    userNamePasswordRequestIsPending || apiKeyValueRequestIsPending;

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(undefined);
    if (loginType === LoginType.Password) {
      const randStr = (Math.random() + 1).toString(36).substring(5);
      login({
        email: formData.email.trim(),
        password: formData.password,
        keyName: `keeply.收好扩展： (${randStr})`,
      });
    } else {
      validateApiKey({ apiKey: apiKey.trim() });
    }
  };

  return (
    <div className="flex flex-col gap-6 pb-2 pt-6">
      <div className="flex justify-center">
        <Logo className="h-10" />
      </div>

      <form className="flex flex-col gap-3" onSubmit={onSubmit}>
        {loginType === LoginType.Password ? (
          <>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="text-sm font-medium">
                邮箱
              </label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="username"
                placeholder="you@example.com"
                autoFocus
                value={formData.email}
                onChange={(e) =>
                  setFormData((f) => ({ ...f, email: e.target.value }))
                }
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="text-sm font-medium">
                密码
              </label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                value={formData.password}
                onChange={(e) =>
                  setFormData((f) => ({ ...f, password: e.target.value }))
                }
              />
            </div>
          </>
        ) : (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="apiKey" className="text-sm font-medium">
              API 密钥
            </label>
            <Input
              id="apiKey"
              name="apiKey"
              type="password"
              autoComplete="off"
              placeholder="粘贴 API 密钥"
              autoFocus
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
          </div>
        )}

        {error && <ErrorCallout>{error}</ErrorCallout>}

        <Button type="submit" disabled={isPending} className="mt-1 gap-2">
          {isPending && <Spinner className="size-4" />}
          {isPending ? "正在登录…" : "登录"}
        </Button>
      </form>

      <div className="flex flex-col items-center gap-2.5 text-xs text-muted-foreground">
        <button
          type="button"
          onClick={() => navigate("/server")}
          className="flex max-w-full items-center gap-1.5 rounded-full border px-3 py-1 hover:bg-accent hover:text-foreground"
          title="更改服务器"
        >
          <Server className="size-3.5 shrink-0" />
          <span className="truncate">
            {settings.address.replace(/^https?:\/\//, "")}
          </span>
        </button>
        <button
          type="button"
          onClick={() => {
            setLoginType(
              loginType === LoginType.Password
                ? LoginType.ApiKey
                : LoginType.Password,
            );
            setError(undefined);
          }}
          className="underline-offset-4 hover:text-foreground hover:underline"
        >
          {loginType === LoginType.Password
            ? "使用 API 密钥登录"
            : "使用邮箱和密码登录"}
        </button>
        <span>
          第一次使用收好？{" "}
          <a
            href={`${settings.address}/signup`}
            target="_blank"
            rel="noreferrer"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            创建账号
          </a>
        </span>
      </div>
    </div>
  );
}
