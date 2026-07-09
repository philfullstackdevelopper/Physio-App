"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentAccess } from "@/lib/billing/context";
import { newRoomName } from "@/lib/video/provider";

// Kiné (Pro) starts a télésoin call for one of their patients.
export async function startCall(formData: FormData) {
  const patientId = formData.get("patient_id");
  if (typeof patientId !== "string") throw new Error("Patient manquant.");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const access = await getCurrentAccess(supabase, user.id);
  if (access.role !== "instructor" || !access.access.capabilities.telesoinWorkflow) {
    redirect("/billing"); // requires Kiné Pro
  }

  // The patient must belong to this kiné (defence in depth; RLS also enforces it).
  const { data: patient } = await supabase
    .from("patients")
    .select("id")
    .eq("id", patientId)
    .eq("instructor_id", user.id)
    .maybeSingle();
  if (!patient) throw new Error("Patient introuvable.");

  const { data: call, error } = await supabase
    .from("video_calls")
    .insert({ kine_id: user.id, patient_id: patientId, room_name: newRoomName(), status: "active" })
    .select("id")
    .single();
  if (error || !call) throw new Error("Impossible de démarrer l'appel.");

  redirect(`/telesoin/${call.id}`);
}

// Kiné schedules a télésoin session for a future date/time.
export async function scheduleCall(formData: FormData) {
  const patientId = formData.get("patient_id");
  const when = formData.get("scheduled_at");
  if (typeof patientId !== "string" || typeof when !== "string" || !when) {
    throw new Error("Informations manquantes.");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const access = await getCurrentAccess(supabase, user.id);
  if (access.role !== "instructor" || !access.access.capabilities.telesoinWorkflow) {
    redirect("/billing");
  }

  const { data: patient } = await supabase
    .from("patients")
    .select("id")
    .eq("id", patientId)
    .eq("instructor_id", user.id)
    .maybeSingle();
  if (!patient) throw new Error("Patient introuvable.");

  await supabase.from("video_calls").insert({
    kine_id: user.id,
    patient_id: patientId,
    room_name: newRoomName(),
    status: "scheduled",
    scheduled_at: new Date(when).toISOString(),
  });

  redirect("/telesoin");
}

// Kiné cancels a scheduled session.
export async function cancelScheduled(formData: FormData) {
  const callId = formData.get("call_id");
  if (typeof callId !== "string") return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase
    .from("video_calls")
    .delete()
    .eq("id", callId)
    .eq("kine_id", user.id)
    .eq("status", "scheduled");

  redirect("/telesoin");
}

// Kiné ends a call.
export async function endCall(formData: FormData) {
  const callId = formData.get("call_id");
  if (typeof callId !== "string") return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase
    .from("video_calls")
    .update({ status: "ended", ended_at: new Date().toISOString() })
    .eq("id", callId)
    .eq("kine_id", user.id);

  redirect("/telesoin");
}
