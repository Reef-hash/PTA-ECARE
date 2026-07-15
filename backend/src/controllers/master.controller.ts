import { Request, Response } from 'express';
import pool from '../config/mysql.js';

// Categories
export const getCategories = async (req: Request, res: Response): Promise<void> => {
    try {
        const [rows] = await pool.query('SELECT * FROM categories ORDER BY id ASC');
        res.json({ categories: rows || [] });
    } catch (error) {
        console.error('Get categories error:', error);
        res.status(500).json({ error: 'Failed to fetch categories' });
    }
};

export const createCategory = async (req: Request, res: Response): Promise<void> => {
    try {
        const { name, description } = req.body;
        const [result]: any = await pool.query(
            'INSERT INTO categories (name, description) VALUES (?, ?)',
            [name, description || null]
        );
        const [rows]: any = await pool.query('SELECT * FROM categories WHERE id = ?', [result.insertId]);
        res.status(201).json(rows[0]);
    } catch (error) {
        console.error('Create category error:', error);
        res.status(500).json({ error: 'Failed to create category' });
    }
};

export const updateCategory = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { name, description } = req.body;
        await pool.query(
            'UPDATE categories SET name = ?, description = ? WHERE id = ?',
            [name, description || null, id]
        );
        const [rows]: any = await pool.query('SELECT * FROM categories WHERE id = ?', [id]);
        res.json(rows[0]);
    } catch (error) {
        console.error('Update category error:', error);
        res.status(500).json({ error: 'Failed to update category' });
    }
};

export const deleteCategory = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        await pool.query('DELETE FROM categories WHERE id = ?', [id]);
        res.json({ message: 'Category deleted' });
    } catch (error) {
        console.error('Delete category error:', error);
        res.status(500).json({ error: 'Failed to delete category' });
    }
};

// Subcategories
export const getSubcategories = async (req: Request, res: Response): Promise<void> => {
    try {
        const { category_id } = req.query;
        let query = `
            SELECT s.*, c.name as category_name 
            FROM subcategories s 
            LEFT JOIN categories c ON s.category_id = c.id
        `;
        const params: any[] = [];
        
        if (category_id) {
            query += ' WHERE s.category_id = ?';
            params.push(category_id);
        }
        
        query += ' ORDER BY s.id ASC';

        const [rows] = await pool.query(query, params);
        res.json({ subcategories: rows || [] });
    } catch (error) {
        console.error('Get subcategories error:', error);
        res.status(500).json({ error: 'Failed to fetch subcategories' });
    }
};

export const createSubcategory = async (req: Request, res: Response): Promise<void> => {
    try {
        const { category_id, name } = req.body;
        const [result]: any = await pool.query(
            'INSERT INTO subcategories (category_id, name) VALUES (?, ?)',
            [category_id, name]
        );
        const [rows]: any = await pool.query('SELECT * FROM subcategories WHERE id = ?', [result.insertId]);
        res.status(201).json(rows[0]);
    } catch (error) {
        console.error('Create subcategory error:', error);
        res.status(500).json({ error: 'Failed to create subcategory' });
    }
};

export const updateSubcategory = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { category_id, name } = req.body;
        await pool.query(
            'UPDATE subcategories SET category_id = ?, name = ? WHERE id = ?',
            [category_id, name, id]
        );
        const [rows]: any = await pool.query('SELECT * FROM subcategories WHERE id = ?', [id]);
        res.json(rows[0]);
    } catch (error) {
        console.error('Update subcategory error:', error);
        res.status(500).json({ error: 'Failed to update subcategory' });
    }
};

export const deleteSubcategory = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        await pool.query('DELETE FROM subcategories WHERE id = ?', [id]);
        res.json({ message: 'Subcategory deleted' });
    } catch (error) {
        console.error('Delete subcategory error:', error);
        res.status(500).json({ error: 'Failed to delete subcategory' });
    }
};

// Brands
export const getBrands = async (req: Request, res: Response): Promise<void> => {
    try {
        const { category_id } = req.query;
        let query = `
            SELECT b.*, c.name as category_name 
            FROM brands b 
            LEFT JOIN categories c ON b.category_id = c.id
        `;
        const params: any[] = [];
        
        if (category_id) {
            query += ' WHERE b.category_id = ?';
            params.push(category_id);
        }
        
        query += ' ORDER BY b.name ASC';

        const [rows] = await pool.query(query, params);
        res.json({ brands: rows || [] });
    } catch (error) {
        console.error('Get brands error:', error);
        res.status(500).json({ error: 'Failed to fetch brands' });
    }
};

export const createBrand = async (req: Request, res: Response): Promise<void> => {
    try {
        const { category_id, name } = req.body;
        const [result]: any = await pool.query(
            'INSERT INTO brands (category_id, name) VALUES (?, ?)',
            [category_id, name]
        );
        const [rows]: any = await pool.query('SELECT * FROM brands WHERE id = ?', [result.insertId]);
        res.status(201).json(rows[0]);
    } catch (error) {
        console.error('Create brand error:', error);
        res.status(500).json({ error: 'Failed to create brand' });
    }
};

export const updateBrand = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { category_id, name } = req.body;
        await pool.query(
            'UPDATE brands SET category_id = ?, name = ? WHERE id = ?',
            [category_id, name, id]
        );
        const [rows]: any = await pool.query('SELECT * FROM brands WHERE id = ?', [id]);
        res.json(rows[0]);
    } catch (error) {
        console.error('Update brand error:', error);
        res.status(500).json({ error: 'Failed to update brand' });
    }
};

export const deleteBrand = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        await pool.query('DELETE FROM brands WHERE id = ?', [id]);
        res.json({ message: 'Brand deleted' });
    } catch (error) {
        console.error('Delete brand error:', error);
        res.status(500).json({ error: 'Failed to delete brand' });
    }
};

// States
export const getStates = async (req: Request, res: Response): Promise<void> => {
    try {
        const [rows] = await pool.query('SELECT * FROM states ORDER BY name ASC');
        res.json({ states: rows || [] });
    } catch (error) {
        console.error('Get states error:', error);
        res.status(500).json({ error: 'Failed to fetch states' });
    }
};

export const createState = async (req: Request, res: Response): Promise<void> => {
    try {
        const { name, description } = req.body;
        const [result]: any = await pool.query(
            'INSERT INTO states (name, description) VALUES (?, ?)',
            [name, description || null]
        );
        const [rows]: any = await pool.query('SELECT * FROM states WHERE id = ?', [result.insertId]);
        res.status(201).json(rows[0]);
    } catch (error) {
        console.error('Create state error:', error);
        res.status(500).json({ error: 'Failed to create state' });
    }
};

export const updateState = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { name, description } = req.body;
        await pool.query(
            'UPDATE states SET name = ?, description = ? WHERE id = ?',
            [name, description || null, id]
        );
        const [rows]: any = await pool.query('SELECT * FROM states WHERE id = ?', [id]);
        res.json(rows[0]);
    } catch (error) {
        console.error('Update state error:', error);
        res.status(500).json({ error: 'Failed to update state' });
    }
};

export const deleteState = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        await pool.query('DELETE FROM states WHERE id = ?', [id]);
        res.json({ message: 'State deleted' });
    } catch (error) {
        console.error('Delete state error:', error);
        res.status(500).json({ error: 'Failed to delete state' });
    }
};
