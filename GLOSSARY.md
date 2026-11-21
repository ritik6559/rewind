# Rewind

A cloud coding agent: a user gives a task on a repo, an agent works on it in its own machine and reports back with changes.

## Language

**Session**:
One task on one repo. It holds every Run made for that task and is the unit that gets deleted when user data is erased.
_Avoid_: Job, conversation, thread

**Run**:
The agent's work from one trigger (a user message or a retry) until it ends as completed, failed or cancelled. A Session holds many Runs.
_Avoid_: Execution, task run

**Step**:
One model call plus the tool calls that call asked for. A Run is a sequence of Steps.
_Avoid_: Turn, iteration

**Workspace**:
The copy of a repo that a Session works on.
_Avoid_: Checkout, project folder

**Event**:
One recorded fact about a Session, in order. The ordered list of Events is the truth of what happened in a Session.
_Avoid_: Log entry, message

**Computer**:
Internal term for the one machine a user's Sessions run in. Never shown to users.
_Avoid_: VM, sandbox (in user-facing text)
