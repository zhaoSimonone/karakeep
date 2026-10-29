"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ActionButton } from "@/components/ui/action-button";
import { Alert, AlertTitle } from "@/components/ui/alert";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { signIn } from "@/lib/auth/client";
import { useClientConfig } from "@/lib/clientConfig";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Lock } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";

const signInSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

const SIGNIN_FAILED = "邮箱或密码不正确";
const OAUTH_FAILED = "第三方登录失败：";

export default function CredentialsForm() {
  const [signinError, setSigninError] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();
  const clientConfig = useClientConfig();

  const oAuthError = searchParams.get("error");
  if (oAuthError && !signinError) {
    setSigninError(`${OAUTH_FAILED} ${oAuthError}`);
  }

  const form = useForm<z.infer<typeof signInSchema>>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  if (clientConfig.auth.disablePasswordAuth) {
    return (
      <div className="space-y-4">
        {signinError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{signinError}</AlertTitle>
          </Alert>
        )}
        <Alert>
          <Lock className="h-4 w-4" />
          <AlertTitle>当前已停用密码登录。</AlertTitle>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form
          // POST so a submit before hydration doesn't put the password in the URL.
          method="post"
          onSubmit={form.handleSubmit(async (value) => {
            const resp = await signIn("credentials", {
              email: value.email.trim(),
              password: value.password,
            });
            if (!resp.ok) {
              if (resp.code === "INVALID_EMAIL_OR_PASSWORD") {
                setSigninError(SIGNIN_FAILED);
              } else if (resp.code === "EMAIL_NOT_VERIFIED") {
                router.replace(
                  `/check-email?email=${encodeURIComponent(value.email.trim())}`,
                );
              } else {
                setSigninError(resp.error ?? SIGNIN_FAILED);
              }
              return;
            }
            router.replace("/");
          })}
          className="space-y-4"
        >
          {signinError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>{signinError}</AlertTitle>
            </Alert>
          )}

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>邮箱</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    autoComplete="email"
                    spellCheck={false}
                    placeholder="请输入邮箱"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>密码</FormLabel>
                <FormControl>
                  <Input
                    type="password"
                    autoComplete="current-password"
                    placeholder="请输入密码"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <ActionButton
            ignoreDemoMode
            type="submit"
            loading={form.formState.isSubmitting}
            className="w-full"
          >
            登录
          </ActionButton>

          <div className="text-center">
            <Link
              href="/forgot-password"
              className="text-sm text-muted-foreground underline hover:text-primary"
            >
              忘记密码？
            </Link>
          </div>
        </form>
      </Form>

      <div className="text-center">
        <p className="text-sm text-gray-600">
          Don&apos;t have an account?{" "}
          <Link
            href="/signup"
            className="font-medium text-blue-600 hover:text-blue-500"
          >
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
