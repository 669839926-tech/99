import { FormationTemplate } from './types';

export const DEFAULT_FORMATIONS: FormationTemplate[] = [
    // 11-a-side
    {
        id: '11-442',
        name: '4-4-2',
        format: '11',
        positions: [
            { label: 'GK', x: 50, y: 90 },
            { label: 'LB', x: 15, y: 75 },
            { label: 'CB', x: 38, y: 75 },
            { label: 'CB', x: 62, y: 75 },
            { label: 'RB', x: 85, y: 75 },
            { label: 'LM', x: 15, y: 45 },
            { label: 'CM', x: 38, y: 45 },
            { label: 'CM', x: 62, y: 45 },
            { label: 'RM', x: 85, y: 45 },
            { label: 'ST', x: 40, y: 15 },
            { label: 'ST', x: 60, y: 15 },
        ]
    },
    {
        id: '11-433',
        name: '4-3-3',
        format: '11',
        positions: [
            { label: 'GK', x: 50, y: 90 },
            { label: 'LB', x: 15, y: 75 },
            { label: 'CB', x: 38, y: 75 },
            { label: 'CB', x: 62, y: 75 },
            { label: 'RB', x: 85, y: 75 },
            { label: 'CDM', x: 50, y: 55 },
            { label: 'CM', x: 35, y: 40 },
            { label: 'CM', x: 65, y: 40 },
            { label: 'LW', x: 20, y: 15 },
            { label: 'RW', x: 80, y: 15 },
            { label: 'ST', x: 50, y: 10 },
        ]
    },
    {
        id: '11-4231',
        name: '4-2-3-1',
        format: '11',
        positions: [
            { label: 'GK', x: 50, y: 90 },
            { label: 'LB', x: 15, y: 75 },
            { label: 'CB', x: 38, y: 75 },
            { label: 'CB', x: 62, y: 75 },
            { label: 'RB', x: 85, y: 75 },
            { label: 'CDM', x: 40, y: 55 },
            { label: 'CDM', x: 60, y: 55 },
            { label: 'LAM', x: 20, y: 35 },
            { label: 'CAM', x: 50, y: 35 },
            { label: 'RAM', x: 80, y: 35 },
            { label: 'ST', x: 50, y: 10 },
        ]
    },
    // 8-a-side
    {
        id: '8-331',
        name: '3-3-1',
        format: '8',
        positions: [
            { label: 'GK', x: 50, y: 90 },
            { label: 'LB', x: 20, y: 70 },
            { label: 'CB', x: 50, y: 75 },
            { label: 'RB', x: 80, y: 70 },
            { label: 'LM', x: 20, y: 40 },
            { label: 'CM', x: 50, y: 45 },
            { label: 'RM', x: 80, y: 40 },
            { label: 'ST', x: 50, y: 15 },
        ]
    },
    {
        id: '8-241',
        name: '2-4-1',
        format: '8',
        positions: [
            { label: 'GK', x: 50, y: 90 },
            { label: 'CB', x: 35, y: 75 },
            { label: 'CB', x: 65, y: 75 },
            { label: 'LM', x: 15, y: 45 },
            { label: 'CM', x: 40, y: 45 },
            { label: 'CM', x: 60, y: 45 },
            { label: 'RM', x: 85, y: 45 },
            { label: 'ST', x: 50, y: 15 },
        ]
    },
    // 5-a-side
    {
        id: '5-121',
        name: '1-2-1 (Diamond)',
        format: '5',
        positions: [
            { label: 'GK', x: 50, y: 90 },
            { label: 'DF', x: 50, y: 70 },
            { label: 'MF', x: 25, y: 45 },
            { label: 'MF', x: 75, y: 45 },
            { label: 'FW', x: 50, y: 20 },
        ]
    },
    {
        id: '5-202',
        name: '2-0-2 (Square)',
        format: '5',
        positions: [
            { label: 'GK', x: 50, y: 90 },
            { label: 'DF', x: 30, y: 70 },
            { label: 'DF', x: 70, y: 70 },
            { label: 'FW', x: 30, y: 30 },
            { label: 'FW', x: 70, y: 30 },
        ]
    }
];

export const POSITION_LABELS_11 = ['GK', 'CB', 'LB', 'RB', 'DM', 'CM', 'AM', 'LW', 'RW', 'ST', 'LM', 'RM', 'LWB', 'RWB', 'CAM', 'CDM'];
export const POSITION_LABELS_SMALL = ['GK', 'DF', 'MF', 'FW'];

export const PITCH_COLORS = {
    Grass: '#2d5a27',
    Blue: '#1e3a8a',
    Grey: '#374151',
    White: '#ffffff',
    Black: '#111827'
};
