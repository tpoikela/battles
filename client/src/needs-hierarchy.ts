

type SentientActor = import('./actor').SentientActor;


export class NeedsHierarchy {

    public actor: SentientActor;

    constructor(actor: SentientActor) {
        this.actor = actor;
    }

    public process(): void {
    }

}

