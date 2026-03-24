import { EventEmitter } from 'events';

class EventBus extends EventEmitter {
    private static instance: EventBus;

    private constructor() {
        super();
    }

    public static getInstance(): EventBus {
        if (!EventBus.instance) {
            EventBus.instance = new EventBus();
        }
        return EventBus.instance;
    }

    public emitEvent(event: string, data: any) {
        console.log(`[EventBus] Emitting event: ${event}`, data);
        this.emit(event, data);
    }
}

export const eventBus = EventBus.getInstance();

export enum Events {
    USER_LOGIN = 'USER_LOGIN',
    BOOK_COMPLETED = 'BOOK_COMPLETED',
    REVIEW_ADDED = 'REVIEW_ADDED',
    WISHLIST_ADDED = 'WISHLIST_ADDED',
}
