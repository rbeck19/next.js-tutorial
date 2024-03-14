'use server';
//Server Actions

//zod is a typescript first validation library. Will validate data types
import { z } from 'zod';
import { sql } from '@vercel/postgres';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

//form Schema with zod validation, with added message if error is thrown
const FormSchema = z.object({
  id: z.string(),
  customerId: z.string({
    invalid_type_error: 'Please select a customer.',
  }),
  amount: z.coerce
    .number()
    .gt(0, { message: 'Please enter an amount greater than $0.' }), //coerce/change to number and validate its type
  status: z.enum(['pending', 'paid'], {
    invalid_type_error: 'Please select an invoice status.',
  }), //enum: fixed set of values
  date: z.string(),
});

//remove these needed keys for CreateInvoice validation on the FormSchema
const CreateInvoice = FormSchema.omit({ id: true, date: true });

export type State = {
  errors?: {
    customerId?: string[];
    amount?: string[];
    status?: string[];
  };
  message?: string | null;
};
//prevState contains the state passed from useFormsState hook
export async function createInvoice(prevState: State, formData: FormData) {
  //convert data into a object
  //   const rawFormData = {
  //     customerId: formData.get('customerId'),
  //     amount: formData.get('amount'),
  //     status: formData.get('status'),
  //   };

  //zod type validation
  //safeParse will contain a success or error
  const validateFields = CreateInvoice.safeParse({
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status'),
  });
  //if form validation fails, return errors early
  if (!validateFields.success) {
    return {
      errors: validateFields.error.flatten().fieldErrors,
      message: 'Missing Fields. Failed to Create Invoice.',
    };
  }
  //prepare data for insertion into database
  const { customerId, amount, status } = validateFields.data;
  //keep amount in cent value
  const amountInCents = amount * 100;
  //create date with format "YYYY-MM-DD"
  const date = new Date().toISOString().split('T')[0];

  try {
    //insert data into sql
    await sql`
        INSERT INTO invoices(customer_id, amount, status, date)
        VALUES (${customerId}, ${amountInCents}, ${status}, ${date})
    `;
  } catch (error) {
    return {
      message: 'Dashboard Error: Failed to Create Invoice',
    };
  }

  //once the database has been updated, the dashboard/invoices path will be revalidated
  //and fresh data will be fetched from the server
  revalidatePath('/dashboard/invoices');
  //now redirect the user back to '/dashboard/invoices' page
  redirect('/dashboard/invoices');
}

const UpdateInvoice = FormSchema.omit({ id: true, date: true });

export async function updateInvoice(
  id: string,
  prevState: State,
  formData: FormData,
) {
  //   const { customerId, amount, status } = UpdateInvoice.parse({
  //     customerId: formData.get('customerId'),
  //     amount: formData.get('amount'),
  //     status: formData.get('status'),
  //   });

  const validateFields = UpdateInvoice.safeParse({
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status'),
  });
  //if type check fails throw error
  if (!validateFields.success) {
    return {
      errors: validateFields.error.flatten().fieldErrors,
      message: 'Missing Fields. Failed to Update Invoice.',
    };
  }

  const { customerId, amount, status } = validateFields.data;

  const amountInCents = amount * 100;

  try {
    //update with data to sql
    await sql`
        UPDATE invoices
        SET customer_id = ${customerId}, amount = ${amountInCents}, status = ${status}
        WHERE id = ${id}
    `;
  } catch (error) {
    return {
      message: 'Database Error: Failed to Update Invoice',
    };
  }

  revalidatePath('/dashboard/invoices'); //reload data
  redirect('/dashboard/invoices'); //change path
}

export async function deleteInvoice(id: string) {
  //error test
  //throw new Error('Failed to Delete');
  try {
    await sql`DELETE FROM invoices WHERE id = ${id}`;
  } catch (error) {
    return {
      message: 'Database Error: Failed to Delete Invoice',
    };
  }

  revalidatePath('/dashboard/invoices');
}
