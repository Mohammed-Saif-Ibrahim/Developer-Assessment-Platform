"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import type { AdminQuestion } from "@dap/types";
import AdminShell from "@/components/AdminShell";
import QuestionForm from "@/components/QuestionForm";
import { adminApi } from "@/lib/api";

export default function EditQuestionPage() {
  const params = useParams<{ id: string }>();
  const [question, setQuestion] = useState<AdminQuestion | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    adminApi
      .getQuestion(params.id)
      .then(setQuestion)
      .catch(() => setNotFound(true));
  }, [params.id]);

  return (
    <AdminShell>
      {notFound && (
        <div className="mx-auto max-w-3xl px-8 py-10 text-[13px] text-[var(--muted)]">
          Question not found.
        </div>
      )}
      {!notFound && !question && (
        <div className="mx-auto max-w-3xl px-8 py-10 text-[13px] text-[var(--muted)]">Loading...</div>
      )}
      {question && <QuestionForm existing={question} />}
    </AdminShell>
  );
}
