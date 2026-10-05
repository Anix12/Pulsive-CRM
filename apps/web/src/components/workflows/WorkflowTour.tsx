'use client';

import { Fragment, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Check, ChevronLeft, ChevronRight, Zap } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { cn } from '@/lib/utils';
import {
  TRIGGER_TYPES,
  WORKFLOW_EXAMPLES,
  stepMeta,
  triggerLabel,
  type WorkflowExample,
} from '@/lib/workflowConfig';

const STEP_HELP: Record<string, { what: string; fieldLabel: string }> = {
  SEND_SMS: { what: 'Sends a text message to the lead. Use {{name}} to insert their name automatically.', fieldLabel: 'Message' },
  SEND_EMAIL: { what: 'Sends an email to the lead. Use {{name}} to insert their name automatically.', fieldLabel: 'Email' },
  WAIT: { what: 'Pauses the workflow before the next step runs. Enter the delay in minutes.', fieldLabel: 'Delay' },
  CREATE_TASK: { what: 'Adds a to-do for your team so a person follows up at the right time.', fieldLabel: 'Task subject' },
  ASSIGN_AGENT: { what: 'Gives the lead an owner. You choose which agent in the form.', fieldLabel: 'Agent' },
  ADD_NOTE: { what: 'Saves a note on the lead so everyone sees what happened.', fieldLabel: 'Note' },
};

function formatDelay(minutes: string) {
  const m = Number(minutes);
  if (!m) return minutes;
  if (m % 1440 === 0) return `${m / 1440} day${m / 1440 > 1 ? 's' : ''} (${m} minutes)`;
  if (m % 60 === 0) return `${m / 60} hour${m / 60 > 1 ? 's' : ''} (${m} minutes)`;
  return `${m} minutes`;
}

function configPreview(type: string, config: Record<string, string>) {
  if (type === 'WAIT') return formatDelay(config.delayMinutes);
  if (type === 'SEND_EMAIL') return [config.subject, config.body].filter(Boolean).join(' — ');
  if (type === 'ASSIGN_AGENT') return 'Pick an agent from the list';
  return config.message || config.subject || config.note || '';
}

export function WorkflowTour({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [example, setExample] = useState<WorkflowExample | null>(null);
  // 0 = trigger, 1..n = steps, n + 1 = save & activate
  const [page, setPage] = useState(0);

  const close = () => {
    onClose();
    setExample(null);
    setPage(0);
  };

  const totalPages = example ? example.steps.length + 2 : 0;

  return (
    <Modal
      open={open}
      onClose={close}
      size="lg"
      title={example ? example.name : 'Try an example'}
      description={
        example
          ? `Step ${page + 1} of ${totalPages}`
          : 'Pick one, and we will walk you through how it is built, one step at a time.'
      }
    >
      {!example ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {WORKFLOW_EXAMPLES.map((ex) => (
            <button
              key={ex.id}
              onClick={() => setExample(ex)}
              className="flex flex-col rounded-xl border border-gray-200 p-4 text-left transition hover:border-primary hover:bg-primary/5"
            >
              <span className="text-sm font-semibold text-gray-900">{ex.name}</span>
              <span className="mt-1 text-xs text-gray-500">{ex.description}</span>
            </button>
          ))}
        </div>
      ) : (
        <div className="space-y-5">
          {/* Flow overview — the node for the current page is highlighted */}
          <div className="flex flex-wrap items-center gap-1.5 rounded-xl bg-gray-50 p-3">
            {[
              { label: triggerLabel(example.trigger), icon: Zap, key: 'trigger' },
              ...example.steps.map((s, i) => ({
                label: stepMeta(s.type)?.label ?? s.type,
                icon: stepMeta(s.type)?.icon ?? Zap,
                key: `s${i}`,
              })),
            ].map((node, i) => {
              const Icon = node.icon;
              return (
                <Fragment key={node.key}>
                  {i > 0 && <ArrowRight className="h-3 w-3 text-gray-300" />}
                  <button
                    onClick={() => setPage(i)}
                    className={cn(
                      'flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium transition',
                      page === i ? 'bg-primary text-primary-foreground' : 'bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-gray-100',
                    )}
                  >
                    <Icon className="h-3 w-3" /> {node.label}
                  </button>
                </Fragment>
              );
            })}
          </div>

          <TourPage example={example} page={page} />

          <div className="flex items-center justify-between border-t border-gray-100 pt-4">
            <button
              onClick={() => (page === 0 ? setExample(null) : setPage(page - 1))}
              className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
            >
              <ChevronLeft className="h-4 w-4" /> {page === 0 ? 'Choose another' : 'Back'}
            </button>
            {page < totalPages - 1 ? (
              <button
                onClick={() => setPage(page + 1)}
                className="flex items-center gap-1 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
              >
                Next <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                onClick={() => router.push(`/dashboard/workflows/new?example=${example.id}`)}
                className="flex items-center gap-1 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
              >
                <Check className="h-4 w-4" /> Build this workflow
              </button>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}

function TourPage({ example, page }: { example: WorkflowExample; page: number }) {
  const lastPage = example.steps.length + 1;

  if (page === 0) {
    const trigger = TRIGGER_TYPES.find((t) => t.value === example.trigger);
    return (
      <Slide
        badge="Trigger"
        title="First, choose when the workflow starts"
        text="Every workflow begins with one trigger. It is the event that sets everything in motion."
      >
        <Detail label="Trigger in this example" value={`${trigger?.label} — ${trigger?.description.toLowerCase()}`} />
        <Tip>In the form, this is the “Select a trigger” list at the top.</Tip>
      </Slide>
    );
  }

  if (page === lastPage) {
    return (
      <Slide
        badge="Finish"
        title="Save it, then switch it on"
        text="Give your workflow a name, press Save, and it appears on the Workflows page."
      >
        <Detail label="Good to know" value="New workflows start paused (Inactive), so nothing is sent by accident." />
        <Detail label="To start it" value="Press the ▶ play button on the workflow card. Use ⏸ to pause it any time." />
        <Tip>Press “Build this workflow” below to open the form with this example already filled in.</Tip>
      </Slide>
    );
  }

  const step = example.steps[page - 1];
  const meta = stepMeta(step.type);
  const help = STEP_HELP[step.type];
  return (
    <Slide
      badge={`Step ${page}`}
      title={`Then, ${meta?.label ?? step.type}`}
      text={help?.what ?? 'This action runs after the previous step finishes.'}
    >
      <Detail label={help?.fieldLabel ?? 'Setting'} value={configPreview(step.type, step.config) || 'No settings needed'} />
      <Tip>
        Steps run top to bottom. In the form, press “Add step” to add this one, then fill in its fields.
      </Tip>
    </Slide>
  );
}

function Slide({ badge, title, text, children }: { badge: string; title: string; text: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <span className="inline-block rounded-md bg-primary/10 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-primary">{badge}</span>
      <h3 className="text-lg font-bold text-gray-900">{title}</h3>
      <p className="text-sm text-gray-600">{text}</p>
      {children}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-100 bg-white px-3 py-2.5">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{label}</p>
      <p className="mt-0.5 text-sm text-gray-900">{value}</p>
    </div>
  );
}

function Tip({ children }: { children: React.ReactNode }) {
  return <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">💡 {children}</p>;
}
