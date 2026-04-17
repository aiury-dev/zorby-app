import React from "react";
import { ErrorState as UniversalErrorState } from "./ui/ErrorState";

type ErrorStateProps = {
  title: string;
  body: string;
  onRetry: () => void;
};

export function ErrorState({ title, body, onRetry }: ErrorStateProps) {
  return <UniversalErrorState type="network" title={title} subtitle={body} onRetry={onRetry} />;
}
