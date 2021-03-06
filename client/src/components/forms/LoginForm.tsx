import { Formik, Form, FormikHelpers } from 'formik';
import { Link } from 'react-router-dom';
import { FirebaseError, signInWithEmailAndPassword } from '../../apis/firebase';
import { LoginValidationSchema } from '../../form-validation';
import { FieldLabel } from './FieldLabel';
import { TextField } from './TextField';
import { LoadingSpinner } from '../widgets/LoadingSpinner';
import { FieldErrorMessage } from './FieldErrorMessage';

interface FormValues {
  email: string;
  password: string;
}

const initialValues: FormValues = {
  email: '',
  password: '',
};

export const LoginForm: React.FC<React.HTMLAttributes<HTMLDivElement>> = props => {
  const handleSubmit = async (values: FormValues, helpers: FormikHelpers<FormValues>) => {
    const error = await signInWithEmailAndPassword(values.email, values.password);
    return handleFirebaseError(error, message => {
      helpers.setErrors({ email: message, password: message });
    });
  };

  const handleFirebaseError = (
    error: FirebaseError | null,
    setError: (message: string) => void
  ) => {
    if (!error) {
      return;
    }

    switch (error) {
      case FirebaseError.UserNotFound:
      case FirebaseError.WrongPassword:
        return setError('Incorrect email or password.');
      case FirebaseError.UserDisabled:
        return setError(
          'This account has been temporarily disabled. Try again later or contact support.'
        );
      case FirebaseError.TooManyRequests:
        return setError('Too many attempts. Try again later or reset your password.');
      default:
        return setError('An unknown error occurred. Please try again.');
    }
  };

  return (
    <div {...props}>
      <Formik
        initialValues={initialValues}
        onSubmit={handleSubmit}
        validationSchema={LoginValidationSchema}
      >
        {({ isSubmitting, errors, touched }) => (
          <Form className="space-y-4">
            <div>
              <FieldLabel label="Email" htmlFor="email" />
              <TextField
                name="email"
                id="email"
                placeholder="name@example.com"
                type="text"
                autoComplete="email"
                className={`mt-1 w-full ${errors.email && touched.email && 'border-red-400'}`}
                tabIndex={1}
                required
              />
              <div className="mt-1 h-3">
                <FieldErrorMessage name="email" />
              </div>
            </div>
            <div>
              <div className="flex justify-between items-center">
                <FieldLabel label="Password" htmlFor="password" />
                <Link to="/forgot-password" className="text-sm text-indigo-500">
                  Forgot your password?
                </Link>
              </div>
              <TextField
                name="password"
                type="password"
                id="password"
                autoComplete="password"
                className={`mt-1 w-full ${errors.password && touched.password && 'border-red-400'}`}
                tabIndex={2}
                required
              />
              <div className="mt-1 h-3">
                <FieldErrorMessage name="password" />
              </div>
            </div>
            <button
              type="submit"
              className={`w-full p-3 flex items-center justify-center rounded ${
                isSubmitting ? 'bg-indigo-300 pointer-events-none' : 'bg-indigo-500'
              } text-white font-medium focus:ring focus:outline-none`}
            >
              {isSubmitting ? <LoadingSpinner /> : 'Log in'}
            </button>
          </Form>
        )}
      </Formik>
    </div>
  );
};
