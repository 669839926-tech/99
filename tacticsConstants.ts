
import { FormationTemplate } from './types';

export const FORMATIONS: FormationTemplate[] = [
    // 11v11
    {
        name: '4-3-3',
        format: '11v11',
        positions: [
            { label: 'GK', x: 50, y: 90 },
            { label: 'LB', x: 15, y: 70 },
            { label: 'CB', x: 35, y: 75 },
            { label: 'CB', x: 65, y: 75 },
            { label: 'RB', x: 85, y: 70 },
            { label: 'CDM', x: 50, y: 60 },
            { label: 'CM', x: 30, y: 45 },
            { label: 'CM', x: 70, y: 45 },
            { label: 'LW', x: 20, y: 25 },
            { label: 'RW', x: 80, y: 25 },
            { label: 'ST', x: 50, y: 15 },
        ]
    },
    {
        name: '4-4-2',
        format: '11v11',
        positions: [
            { label: 'GK', x: 50, y: 90 },
            { label: 'LB', x: 15, y: 70 },
            { label: 'CB', x: 35, y: 75 },
            { label: 'CB', x: 65, y: 75 },
            { label: 'RB', x: 85, y: 70 },
            { label: 'LM', x: 15, y: 45 },
            { label: 'CM', x: 40, y: 50 },
            { label: 'CM', x: 60, y: 50 },
            { label: 'RM', x: 85, y: 45 },
            { label: 'ST', x: 40, y: 20 },
            { label: 'ST', x: 60, y: 20 },
        ]
    },
    {
        name: '4-2-3-1',
        format: '11v11',
        positions: [
            { label: 'GK', x: 50, y: 90 },
            { label: 'LB', x: 15, y: 70 },
            { label: 'CB', x: 35, y: 75 },
            { label: 'CB', x: 65, y: 75 },
            { label: 'RB', x: 85, y: 70 },
            { label: 'CDM', x: 35, y: 55 },
            { label: 'CDM', x: 65, y: 55 },
            { label: 'LAM', x: 20, y: 35 },
            { label: 'CAM', x: 50, y: 35 },
            { label: 'RAM', x: 80, y: 35 },
            { label: 'ST', x: 50, y: 15 },
        ]
    },
    {
        name: '3-4-3',
        format: '11v11',
        positions: [
            { label: 'GK', x: 50, y: 90 },
            { label: 'CB', x: 25, y: 75 },
            { label: 'CB', x: 50, y: 75 },
            { label: 'CB', x: 75, y: 75 },
            { label: 'LM', x: 15, y: 45 },
            { label: 'CM', x: 40, y: 50 },
            { label: 'CM', x: 60, y: 50 },
            { label: 'RM', x: 85, y: 45 },
            { label: 'LW', x: 25, y: 20 },
            { label: 'RW', x: 75, y: 20 },
            { label: 'ST', x: 50, y: 15 },
        ]
    },
    {
        name: '3-5-2',
        format: '11v11',
        positions: [
            { label: 'GK', x: 50, y: 90 },
            { label: 'CB', x: 25, y: 75 },
            { label: 'CB', x: 50, y: 75 },
            { label: 'CB', x: 75, y: 75 },
            { label: 'LWB', x: 15, y: 55 },
            { label: 'CDM', x: 50, y: 60 },
            { label: 'CM', x: 35, y: 45 },
            { label: 'CM', x: 65, y: 45 },
            { label: 'RWB', x: 85, y: 55 },
            { label: 'ST', x: 40, y: 20 },
            { label: 'ST', x: 60, y: 20 },
        ]
    },
    // 8v8
    {
        name: '3-3-1',
        format: '8v8',
        positions: [
            { label: 'GK', x: 50, y: 90 },
            { label: 'DF', x: 20, y: 70 },
            { label: 'DF', x: 50, y: 75 },
            { label: 'DF', x: 80, y: 70 },
            { label: 'MF', x: 20, y: 45 },
            { label: 'MF', x: 50, y: 45 },
            { label: 'MF', x: 80, y: 45 },
            { label: 'FW', x: 50, y: 20 },
        ]
    },
    {
        name: '3-2-2',
        format: '8v8',
        positions: [
            { label: 'GK', x: 50, y: 90 },
            { label: 'DF', x: 20, y: 70 },
            { label: 'DF', x: 50, y: 75 },
            { label: 'DF', x: 80, y: 70 },
            { label: 'MF', x: 35, y: 45 },
            { label: 'MF', x: 65, y: 45 },
            { label: 'FW', x: 35, y: 20 },
            { label: 'FW', x: 65, y: 20 },
        ]
    },
    {
        name: '2-3-2',
        format: '8v8',
        positions: [
            { label: 'GK', x: 50, y: 90 },
            { label: 'DF', x: 35, y: 75 },
            { label: 'DF', x: 65, y: 75 },
            { label: 'MF', x: 20, y: 45 },
            { label: 'MF', x: 50, y: 45 },
            { label: 'MF', x: 80, y: 45 },
            { label: 'FW', x: 35, y: 20 },
            { label: 'FW', x: 65, y: 20 },
        ]
    },
    {
        name: '3-1-2-1',
        format: '8v8',
        positions: [
            { label: 'GK', x: 50, y: 90 },
            { label: 'DF', x: 20, y: 70 },
            { label: 'DF', x: 50, y: 75 },
            { label: 'DF', x: 80, y: 70 },
            { label: 'CDM', x: 50, y: 55 },
            { label: 'MF', x: 30, y: 35 },
            { label: 'MF', x: 70, y: 35 },
            { label: 'FW', x: 50, y: 15 },
        ]
    },
    // 5v5
    {
        name: '2-2',
        format: '5v5',
        positions: [
            { label: 'GK', x: 50, y: 90 },
            { label: 'DF', x: 30, y: 70 },
            { label: 'DF', x: 70, y: 70 },
            { label: 'FW', x: 30, y: 30 },
            { label: 'FW', x: 70, y: 30 },
        ]
    },
    {
        name: '2-1-1',
        format: '5v5',
        positions: [
            { label: 'GK', x: 50, y: 90 },
            { label: 'DF', x: 30, y: 70 },
            { label: 'DF', x: 70, y: 70 },
            { label: 'MF', x: 50, y: 45 },
            { label: 'FW', x: 50, y: 20 },
        ]
    },
    {
        name: '1-2-1',
        format: '5v5',
        positions: [
            { label: 'GK', x: 50, y: 90 },
            { label: 'DF', x: 50, y: 75 },
            { label: 'MF', x: 25, y: 45 },
            { label: 'MF', x: 75, y: 45 },
            { label: 'FW', x: 50, y: 20 },
        ]
    },
    {
        name: '1-1-2',
        format: '5v5',
        positions: [
            { label: 'GK', x: 50, y: 90 },
            { label: 'DF', x: 50, y: 75 },
            { label: 'MF', x: 50, y: 50 },
            { label: 'FW', x: 30, y: 25 },
            { label: 'FW', x: 70, y: 25 },
        ]
    }
];
