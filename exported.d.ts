declare class TrimId {
    static setup(machine_id: string, session_id: string): void;
    static longid(base:32|62=62): string;
    static shortid(base:32|62=62): string;
    static read(id: string, base:32|62=62): {
        timestamp: number;
        machine_id?: number;
        session_id?: number;
        identity?: number;
        seq: number;
    };
}

export = TrimId;