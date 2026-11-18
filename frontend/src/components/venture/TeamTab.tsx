// Copyright (c) 2026 HDOS Rwanda. All rights reserved.
"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { FormError } from "@/components/States";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { getErrorMessage, applicationsApi, ventureApi } from "@/lib/api";
import type { InvitableRole, Member, VentureSection } from "@/lib/venture-types";
import { useVenture } from "./access";
import { useRefreshVenture, ventureKey } from "./hooks";
import { INVITABLE_ROLES, ROLE_HELP, ROLE_LABELS, SHAREABLE_SECTIONS, sectionLabel } from "./format";
import { CheckboxField, Field, QueryView, ReadOnlyNote, Section } from "./shared";

const isInvitableRole = (value: string): value is InvitableRole =>
  INVITABLE_ROLES.some((role) => role === value);

export function TeamTab() {
  const { id, can } = useVenture();
  const refresh = useRefreshVenture(id);
  const members = useQuery({ queryKey: ventureKey(id, "members"), queryFn: () => ventureApi.members(id) });
  const roleTemplates = useQuery({ queryKey: ["venture", "team-roles"], queryFn: () => ventureApi.teamRoles() });
  const links = useQuery({ queryKey: ventureKey(id, "documents"), queryFn: () => ventureApi.documents(id) });
  const documents = useQuery({ queryKey: ["portal-documents"], queryFn: () => applicationsApi.documents() });
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<InvitableRole>("CONTRIBUTOR");
  const [sharedSections, setSharedSections] = useState<VentureSection[]>([]);
  const [documentId, setDocumentId] = useState("");
  const [documentLabel, setDocumentLabel] = useState("");
  const [roleEdits, setRoleEdits] = useState<Record<string, InvitableRole>>({});
  const [sectionEdits, setSectionEdits] = useState<Record<string, VentureSection[]>>({});
  const [error, setError] = useState("");

  const invite = useMutation({
    mutationFn: () => ventureApi.invite(id, { email: email.trim(), role, ...(role === "ADVISOR" ? { sharedSections } : {}) }),
    onSuccess: () => { setEmail(""); setSharedSections([]); setError(""); refresh("members"); },
    onError: (e) => setError(getErrorMessage(e)),
  });
  const updateMember = useMutation({
    mutationFn: ({ memberId, input }: { memberId: string; input: { role?: InvitableRole; sharedSections?: VentureSection[] } }) =>
      ventureApi.updateMember(id, memberId, input),
    onSuccess: (member) => {
      setRoleEdits((rows) => { const next = { ...rows }; delete next[member.id]; return next; });
      setSectionEdits((rows) => { const next = { ...rows }; delete next[member.id]; return next; });
      setError("");
      refresh("members");
    },
    onError: (e) => setError(getErrorMessage(e)),
  });
  const removeMember = useMutation({
    mutationFn: (memberId: string) => ventureApi.removeMember(id, memberId),
    onSuccess: () => { setError(""); refresh("members"); },
    onError: (e) => setError(getErrorMessage(e)),
  });
  const linkDocument = useMutation({
    mutationFn: () => ventureApi.linkDocument(id, { documentId, label: documentLabel.trim() }),
    onSuccess: () => { setDocumentId(""); setDocumentLabel(""); setError(""); refresh("documents"); },
    onError: (e) => setError(getErrorMessage(e)),
  });
  const unlinkDocument = useMutation({
    mutationFn: (linkId: string) => ventureApi.unlinkDocument(id, linkId),
    onSuccess: () => { setError(""); refresh("documents"); },
    onError: (e) => setError(getErrorMessage(e)),
  });

  const toggleInviteSection = (section: VentureSection, checked: boolean) => {
    setSharedSections((current) => checked ? [...new Set([...current, section])] : current.filter((value) => value !== section));
  };
  const updateSectionEdit = (memberId: string, section: VentureSection, checked: boolean) => {
    const current = sectionEdits[memberId] ?? [];
    setSectionEdits((rows) => ({
      ...rows,
      [memberId]: checked ? [...new Set([...current, section])] : current.filter((value) => value !== section),
    }));
  };

  return (
    <div className="space-y-6">
      <Section title="Team" description="Invite collaborators with only the access they need. Advisors see only sections you choose to share.">
        <FormError message={error} />
        {!can("manage") && <ReadOnlyNote>Only the owner or an administrator can manage team membership.</ReadOnlyNote>}
        {can("manage") && (
          <form className="grid gap-3 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); setError(""); invite.mutate(); }}>
            <Field htmlFor="team-email" label="Invite by email"><Input id="team-email" type="email" required maxLength={254} value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
            <Field htmlFor="team-role" label="Role">
              <Select id="team-role" value={role} onChange={(e) => { if (isInvitableRole(e.target.value)) setRole(e.target.value); }}>
                {INVITABLE_ROLES.map((value) => <option key={value} value={value}>{ROLE_LABELS[value]}</option>)}
              </Select>
              <p className="mt-1 text-xs text-muted-foreground">{ROLE_HELP[role]}</p>
            </Field>
            {role === "ADVISOR" && (
              <fieldset className="space-y-2 rounded-md border p-3 sm:col-span-2">
                <legend className="px-1 text-sm font-medium">Sections to share</legend>
                <div className="grid gap-2 sm:grid-cols-2">
                  {SHAREABLE_SECTIONS.map((section) => (
                    <CheckboxField key={section.id} id={`invite-share-${section.id}`} checked={sharedSections.includes(section.id)} onChange={(checked) => toggleInviteSection(section.id, checked)}>
                      {section.label}
                    </CheckboxField>
                  ))}
                </div>
              </fieldset>
            )}
            <div className="sm:col-span-2"><Button type="submit" disabled={invite.isPending || !email.trim()}>{invite.isPending ? "Sending…" : "Send invitation"}</Button></div>
          </form>
        )}

        <QueryView query={members}>
          {(rows) => rows.length === 0 ? <p className="text-sm text-muted-foreground">No team members are listed.</p> : (
            <ul className="space-y-3">
              {rows.map((member) => (
                <MemberRow
                  key={member.id}
                  member={member}
                  canManage={can("manage")}
                  role={roleEdits[member.id] ?? (member.role === "OWNER" ? "CONTRIBUTOR" : member.role)}
                  sections={sectionEdits[member.id] ?? member.sharedSections}
                  onRoleChange={(next) => setRoleEdits((value) => ({ ...value, [member.id]: next }))}
                  onSectionChange={(section, checked) => updateSectionEdit(member.id, section, checked)}
                  onSave={() => {
                    const nextRole = roleEdits[member.id] ?? (member.role === "OWNER" ? "CONTRIBUTOR" : member.role);
                    updateMember.mutate({
                      memberId: member.id,
                      input: {
                        role: nextRole,
                        ...(nextRole === "ADVISOR" ? { sharedSections: sectionEdits[member.id] ?? member.sharedSections } : {}),
                      },
                    });
                  }}
                  onRemove={() => removeMember.mutate(member.id)}
                  saving={updateMember.isPending}
                  removing={removeMember.isPending}
                />
              ))}
            </ul>
          )}
        </QueryView>
      </Section>

      <Section title="Roles to consider" description="A curated role catalogue to help identify capabilities your venture may need.">
        <QueryView query={roleTemplates}>
          {(roles) => (
            <>
              <p className="text-sm text-muted-foreground">
                These are role templates, not people or endorsements. HDOS has not matched or verified any candidate; inviting a real collaborator requires their consent.
              </p>
              <ul className="grid gap-3 lg:grid-cols-2">
                {roles.map((item) => (
                  <li key={item.key} className="space-y-2 rounded-md border p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="font-medium">{item.title}</h3>
                      <Badge variant="outline">{item.estimatedInvolvement}</Badge>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Competencies</p>
                      <ul className="list-disc pl-5 text-sm">{item.competencies.map((value) => <li key={value}>{value}</li>)}</ul>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Responsibilities</p>
                      <ul className="list-disc pl-5 text-sm">{item.responsibilities.map((value) => <li key={value}>{value}</li>)}</ul>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </QueryView>
      </Section>

      <Section title="Linked documents" description="Links point to documents already in your private Document Vault; they do not copy or expose document contents to the team.">
        {!can("edit") && <ReadOnlyNote>Only editors and above can link or unlink documents.</ReadOnlyNote>}
        {can("edit") && (
          <form className="grid gap-3 sm:grid-cols-3" onSubmit={(e) => { e.preventDefault(); setError(""); linkDocument.mutate(); }}>
            <Field htmlFor="team-document" label="Your vault document">
              <Select id="team-document" value={documentId} onChange={(e) => setDocumentId(e.target.value)}>
                <option value="">Select a document</option>
                {documents.data?.filter((doc) => !links.data?.some((link) => link.document.id === doc.id)).map((doc) => (
                  <option key={doc.id} value={doc.id}>{doc.fileName} · {doc.status}</option>
                ))}
              </Select>
            </Field>
            <Field htmlFor="team-document-label" label="Link label"><Input id="team-document-label" required maxLength={120} value={documentLabel} onChange={(e) => setDocumentLabel(e.target.value)} /></Field>
            <div className="flex items-end"><Button type="submit" disabled={linkDocument.isPending || !documentId || !documentLabel.trim()}>{linkDocument.isPending ? "Linking…" : "Link document"}</Button></div>
          </form>
        )}
        <QueryView query={links}>
          {(rows) => rows.length === 0 ? <p className="text-sm text-muted-foreground">No documents are linked to this venture.</p> : (
            <ul className="space-y-2">
              {rows.map((link) => (
                <li key={link.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3">
                  <div><p className="text-sm font-medium">{link.label}</p><p className="text-xs text-muted-foreground">{link.document.fileName} · {link.document.status} · v{link.document.version}</p></div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{link.document.kind}</Badge>
                    {can("edit") && <Button type="button" size="sm" variant="outline" disabled={unlinkDocument.isPending} onClick={() => unlinkDocument.mutate(link.id)}>Unlink</Button>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </QueryView>
      </Section>
    </div>
  );
}

function MemberRow({
  member,
  canManage,
  role,
  sections,
  onRoleChange,
  onSectionChange,
  onSave,
  onRemove,
  saving,
  removing,
}: {
  member: Member;
  canManage: boolean;
  role: InvitableRole;
  sections: VentureSection[];
  onRoleChange: (role: InvitableRole) => void;
  onSectionChange: (section: VentureSection, checked: boolean) => void;
  onSave: () => void;
  onRemove: () => void;
  saving: boolean;
  removing: boolean;
}) {
  return (
    <li className="space-y-3 rounded-md border p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div><p className="font-medium">{member.name || member.email}</p><p className="text-xs text-muted-foreground">{member.email}</p></div>
        <Badge variant={member.status === "ACTIVE" ? "secondary" : "outline"}>{member.status}</Badge>
      </div>
      {!canManage ? (
        <p className="text-sm text-muted-foreground">{ROLE_LABELS[member.role]}</p>
      ) : member.role === "OWNER" ? (
        <Badge variant="outline">Owner</Badge>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field htmlFor={`member-role-${member.id}`} label="Role">
              <Select id={`member-role-${member.id}`} value={role} onChange={(e) => { if (isInvitableRole(e.target.value)) onRoleChange(e.target.value); }}>
                {INVITABLE_ROLES.map((value) => <option key={value} value={value}>{ROLE_LABELS[value]}</option>)}
              </Select>
            </Field>
            {role === "ADVISOR" && (
              <fieldset className="space-y-2">
                <legend className="text-sm font-medium">Shared sections</legend>
                {SHAREABLE_SECTIONS.map((section) => (
                  <CheckboxField key={section.id} id={`member-${member.id}-${section.id}`} checked={sections.includes(section.id)} onChange={(checked) => onSectionChange(section.id, checked)}>
                    {section.label}
                  </CheckboxField>
                ))}
              </fieldset>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" disabled={saving} onClick={onSave}>{saving ? "Saving…" : "Save access"}</Button>
            <Button type="button" size="sm" variant="outline" disabled={removing} onClick={onRemove}>{removing ? "Removing…" : "Remove member"}</Button>
          </div>
        </>
      )}
      {member.role === "ADVISOR" && <p className="text-xs text-muted-foreground">Shared with advisor: {member.sharedSections.map(sectionLabel).join(", ") || "overview only"}</p>}
    </li>
  );
}
