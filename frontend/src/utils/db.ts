import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

interface OfflineBook {
    id: string;
    title: string;
    author: string;
    cover_image_url?: string;
    blob: Blob;
    storedAt: number;
}

interface ELibraryDB extends DBSchema {
    books: {
        key: string;
        value: OfflineBook;
    };
}

const DB_NAME = 'e-library-offline';
const STORE_NAME = 'books';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<ELibraryDB>>;

const getDB = () => {
    if (!dbPromise) {
        dbPromise = openDB<ELibraryDB>(DB_NAME, DB_VERSION, {
            upgrade(db) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            },
        });
    }
    return dbPromise;
};

export const saveBookOffline = async (book: OfflineBook) => {
    const db = await getDB();
    await db.put(STORE_NAME, book);
};

export const getOfflineBook = async (id: string) => {
    const db = await getDB();
    return await db.get(STORE_NAME, id);
};

export const getAllOfflineBooks = async () => {
    const db = await getDB();
    return await db.getAll(STORE_NAME);
};

export const removeOfflineBook = async (id: string) => {
    const db = await getDB();
    await db.delete(STORE_NAME, id);
};

export const isBookOffline = async (id: string): Promise<boolean> => {
    const db = await getDB();
    const book = await db.get(STORE_NAME, id);
    return !!book;
};
