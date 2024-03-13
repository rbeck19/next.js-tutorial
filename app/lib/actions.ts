'use server';
//Server Actions

//zod is a typescript first validation library. Will validate data types
import { z } from 'zod';
import { sql } from '@vercel/postgres';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

//form Schema with zod validation
const FormSchema = z.object({
  id: z.string(),
  customerId: z.string(),
  amount: z.coerce.number(), //coerce/change to number and validate its type
  status: z.enum(['pending', 'paid']), //enum: fixed set of values
  date: z.string(),
});

//remove these needed keys for CreateInvoice validation on the FormSchema
const CreateInvoice = FormSchema.omit({ id: true, date: true });

export async function createInvoice(formData: FormData) {
  //convert data into a object
  //   const rawFormData = {
  //     customerId: formData.get('customerId'),
  //     amount: formData.get('amount'),
  //     status: formData.get('status'),
  //   };

  //zod type validation
  const { customerId, amount, status } = CreateInvoice.parse({
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status'),
  });
  //keep amount in cent value
  const amountInCents = amount * 100;
  //create date with format "YYYY-MM-DD"
  const date = new Date().toISOString().split('T')[0];

  //insert data into sql
  await sql`
    INSERT INTO invoices(customer_id, amount, status, date)
    VALUES (${customerId}, ${amountInCents}, ${status}, ${date})
  `;
  //once the database has been updated, the dashboard/invoices path will be revalidated
  //and fresh data will be fetched from the server
  revalidatePath('/dashboard/invoices');
  //now redirect the user back to '/dashboard/invoices' page
  redirect('/dashboard/invoices');
}

const UpdateInvoice = FormSchema.omit({ id: true, date: true });

export async function updateInvoice(id: string, formData: FormData) {
  const { customerId, amount, status } = UpdateInvoice.parse({
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status'),
  });
  const amountInCents = amount * 100;

  //update with data to sql
  await sql`
    UPDATE invoices
    SET customer_id = ${customerId}, amount = ${amountInCents}, status = ${status}
    WHERE id = ${id}
    `;

  revalidatePath('/dashboard/invoices'); //reload data
  redirect('/dashboard/invoices'); //change path
}

export async function deleteInvoice(id: string) {
  await sql`DELETE FROM invoices WHERE id = ${id}`;
  revalidatePath('/dashboard/invoices');
}
