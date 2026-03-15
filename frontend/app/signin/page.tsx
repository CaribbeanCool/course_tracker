import SignInForm from "./sign-in-form";

type SearchParams = Record<string, string | string[] | undefined>;

export default async function SignInPage({
  searchParams,
}: {
  searchParams?: SearchParams | Promise<SearchParams>;
}) {
  const resolved = (await Promise.resolve(searchParams)) ?? {};
  const raw = resolved.callbackUrl;
  const callbackUrl = Array.isArray(raw) ? raw[0] : raw;

  return <SignInForm callbackUrl={callbackUrl} />;
}
