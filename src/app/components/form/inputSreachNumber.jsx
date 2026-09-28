import clsx from 'clsx';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { useMemo, useState } from 'react';

const RE_DIGIT = new RegExp( /^\d+$/ );


const InputSearchNumber = ( { onSearch, setQueryText, number = 6, prefix = '*' } ) => {
	const t = useTranslations( 'phoneNumberModal' );
	const [ query, setQuery ] = useState( '' );
	const handleSearch = () => {
		let newQuery = query.trim();
		let length = number - query.trim().length;
		if ( newQuery.length <= number ) {
			for ( let index = 0; index < length; index++ ) {
				newQuery += '*';
			}
		}
		onSearch?.( newQuery.replace( /\*/g, prefix ) );
		// focusInput.setFalse();
	};
	return (

		<div className='w-full flex flex-col items-center mb-4 md:mb-5	'>
			<div className='flex items-center justify-center w-full md:w-auto  md:justify-center gap-1  text-3xl font-itel md:gap-4 '>
				<span className="font-bold text-center text-xl md:text-[32px] text-black ">070</span>
				<OTPInput
					value={ query }
					onChange={ ( value ) => {
						setQueryText?.( value );
						setQuery( value );
					} }
					valueLength={ number }
					onSubmit={ () => handleSearch() }
					containerStyle={ 'truncate bg-transparent outline-none  flex-8' }
					inputStyle=" w-7 sm:w-10 md:w-12  h-[35px] sm:h-[50px] md:h-[60px] text-sm text-neutral-800 border border-neutral-800 rounded-lg mx-1 sm:mx-1.5 flex items-center justify-center text-center "
				/>
				<button onClick={ () => handleSearch() } type="button" className="  w-8 h-8 sm:w-9 sm:h-9 ml-2 md:ml-3 flex items-center justify-center border border-primary rounded-lg hover:bg-primary/10 transition-colors  sm:mt-0" >
					<Image src="/assets/search-icon.svg" alt="Search" width={ 18 } height={ 18 } className="w-4 h-4 sm:w-5 sm:h-5" />
				</button>
			</div>
			<div className='font-medium mt-4 text-neutral-800 text-[14px] tracking-[0] leading-[20px] whitespace-nowrap'>{ t( 'searchHint' ) }</div>

		</div>

	);
};

export default InputSearchNumber;
export const InputSearchNumberVikki = ( { onSearch, setQueryText, number = 6, prefix = '*', searchHint } ) => {

	const [ query, setQuery ] = useState( '' );
	const handleSearch = () => {
		let newQuery = query.trim();
		let length = number - query.trim().length;
		if ( newQuery.length <= number ) {
			for ( let index = 0; index < length; index++ ) {
				newQuery += '*';
			}
		}
		onSearch?.( newQuery.replace( /\*/g, prefix ) );
		// focusInput.setFalse();
	};
	return (

		<div className='w-full flex flex-col items-center mb-4 md:mb-5	'>
			<div className='flex items-center justify-center w-full md:w-auto  md:justify-center gap-1  text-3xl font-itel md:gap-4 '>
				<span className="font-bold text-center text-xl md:text-[32px] text-black ">070</span>
				<OTPInput
					value={ query }
					onChange={ ( value ) => {
						setQueryText?.( value );
						setQuery( value );
					} }
					valueLength={ number }
					onSubmit={ () => handleSearch() }
					containerStyle={ 'truncate bg-transparent outline-none  flex-8' }
					inputStyle=" w-7 sm:w-10 md:w-12  h-[35px] sm:h-[50px] md:h-[60px] text-sm text-neutral-800 border border-neutral-800 rounded-lg mx-1 sm:mx-1.5 flex items-center justify-center text-center "
				/>
				<button onClick={ () => handleSearch() } type="button" className="  w-8 h-8 sm:w-9 sm:h-9  flex items-center justify-center border border-[#0000EA] rounded-lg hover:bg-primary/10 transition-colors " >
					<svg width="21" height="21" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg">
						<path d="M18 17.541L15.0834 14.6243M17.1667 9.62435C17.1667 13.5364 13.9954 16.7077 10.0833 16.7077C6.17132 16.7077 3 13.5364 3 9.62435C3 5.71233 6.17132 2.54102 10.0833 2.54102C13.9954 2.54102 17.1667 5.71233 17.1667 9.62435Z" stroke="#0000EA" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
					</svg>

				</button>
			</div>
			{searchHint && <div className='font-medium mt-4 text-neutral-800 text-[14px] tracking-[0] leading-[20px] whitespace-nowrap'>{searchHint}</div>}

		</div>

	);
};
export const InputSearchNumberHdBank = ( { onSearch, setQueryText, number = 6, prefix = '*', searchHint } ) => {

	const [ query, setQuery ] = useState( '' );
	const handleSearch = () => {
		let newQuery = query.trim();
		let length = number - query.trim().length;
		if ( newQuery.length <= number ) {
			for ( let index = 0; index < length; index++ ) {
				newQuery += '*';
			}
		}
		onSearch?.( newQuery.replace( /\*/g, prefix ) );
		// focusInput.setFalse();
	};
	return (

		<div className='w-full flex flex-col items-center mb-4 md:mb-5	'>
			<div className='flex items-center justify-center w-full md:w-auto  md:justify-center gap-1  text-3xl font-itel md:gap-4 '>
				<span className="font-bold text-center text-xl md:text-[32px] text-black ">070</span>
				<OTPInput
					value={ query }
					onChange={ ( value ) => {
						setQueryText?.( value );
						setQuery( value );
					} }
					valueLength={ number }
					onSubmit={ () => handleSearch() }
					containerStyle={ 'truncate bg-transparent outline-none  flex-8' }
					inputStyle=" w-7 sm:w-10 md:w-12  h-[35px] sm:h-[50px] md:h-[60px] text-sm text-neutral-800 border border-neutral-800 rounded-lg mx-1 sm:mx-1.5 flex items-center justify-center text-center "
				/>
				<button onClick={ () => handleSearch() } type="button" className="  w-8 h-8 sm:w-9 sm:h-9  flex items-center justify-center border border-[#DA2128] rounded-lg hover:bg-primary/10 transition-colors " >
					<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
						<mask id="path-1-inside-1_4654_15707" fill="white">
							<path d="M0 8C0 3.58172 3.58172 0 8 0H32C36.4183 0 40 3.58172 40 8V32C40 36.4183 36.4183 40 32 40H8C3.58172 40 0 36.4183 0 32V8Z"/>
						</mask>
						<path d="M0 8C0 3.58172 3.58172 0 8 0H32C36.4183 0 40 3.58172 40 8V32C40 36.4183 36.4183 40 32 40H8C3.58172 40 0 36.4183 0 32V8Z" fill="white"/>
						<path d="M8 0V1H32V0V-1H8V0ZM40 8H39V32H40H41V8H40ZM32 40V39H8V40V41H32V40ZM0 32H1V8H0H-1V32H0ZM8 40V39C4.13401 39 1 35.866 1 32H0H-1C-1 36.9706 3.02944 41 8 41V40ZM40 32H39C39 35.866 35.866 39 32 39V40V41C36.9706 41 41 36.9706 41 32H40ZM32 0V1C35.866 1 39 4.13401 39 8H40H41C41 3.02944 36.9706 -1 32 -1V0ZM8 0V-1C3.02944 -1 -1 3.02944 -1 8H0H1C1 4.13401 4.13401 1 8 1V0Z" fill="#DA2128" mask="url(#path-1-inside-1_4654_15707)"/>
						<path d="M27.5 27.5L24.5834 24.5833M26.6667 19.5833C26.6667 23.4954 23.4954 26.6667 19.5833 26.6667C15.6713 26.6667 12.5 23.4954 12.5 19.5833C12.5 15.6713 15.6713 12.5 19.5833 12.5C23.4954 12.5 26.6667 15.6713 26.6667 19.5833Z" stroke="#DA2128" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
					</svg>
				</button>
			</div>
			{searchHint && <div className='font-medium mt-4 text-neutral-800 text-[14px] tracking-[0] leading-[20px] whitespace-nowrap'>{searchHint}</div>}

		</div>

	);
};

export const OTPInput = ( { value = '', valueLength, onChange, containerStyle, inputStyle, onFocus, onSubmit, type = 'text' } ) => {
	const valueItems = useMemo( () => {
		const valueArray = value.split( '' );
		const items = [];

		for ( let i = 0; i < valueLength; i++ ) {
			const char = valueArray[ i ];
			if ( RE_DIGIT.test( char ) ) {
				items.push( char );
			} else {
				items.push( '' );
			}
		}

		return items;
	}, [ value, valueLength ] );

	const focusToNextInput = ( target ) => {
		const nextElementSibling = target.nextElementSibling;

		if ( nextElementSibling ) {
			nextElementSibling.focus();
		}
	};

	const focusToPrevInput = ( target ) => {
		const previousElementSibling = target.previousElementSibling;

		if ( previousElementSibling ) {
			previousElementSibling.value = previousElementSibling.value;
			previousElementSibling.focus();
		}
	};

	const inputOnChange = ( e, idx ) => {
		const target = e.target;
		let targetValue = target.value;
		const isTargetValueDigit = RE_DIGIT.test( targetValue );

		if ( !isTargetValueDigit && targetValue !== '' ) {
			return;
		}

		const nextInputEl = target.nextElementSibling;

		if ( !isTargetValueDigit && nextInputEl && nextInputEl.value !== '' ) {
			return;
		}

		targetValue = isTargetValueDigit ? targetValue : ' ';

		const targetValueLength = targetValue.length;

		if ( targetValueLength === 1 ) {
			const newValue = value.substring( 0, idx ) + targetValue + value.substring( idx + 1 );
			onChange( newValue );

			if ( !isTargetValueDigit ) {
				return;
			}

			focusToNextInput( target );
		} else if ( targetValueLength === valueLength ) {
			onChange( targetValue );
			target.blur();
		}
	};

	const inputOnKeyDown = ( e, index ) => {
		const { key } = e;
		const target = e.target;

		if ( key === 'ArrowRight' || key === 'ArrowDown' ) {
			e.preventDefault();
			return focusToNextInput( target );
		}

		if ( key === 'ArrowLeft' || key === 'ArrowUp' ) {
			e.preventDefault();
			return focusToPrevInput( target );
		}

		const targetValue = target.value;
		target.setSelectionRange( 0, targetValue.length );

		if ( key === 'Backspace' ) {
			e.preventDefault();
			let valueArray = value.split( '' );
			valueArray[ index ] = '*';
			onChange( valueArray.join( '' ) );
			focusToPrevInput( target );
			return;
		}

		if ( e.key !== 'Backspace' || targetValue !== '' ) {
			return;
		}

		focusToPrevInput( target );
	};

	const inputOnFocus = ( e, idx ) => {
		const { target } = e;
		onFocus && onFocus();
		target.focus();
		if ( !value ) {
			let item = [];
			for ( let index = 0; index <= idx; index++ ) {
				item.push( '*' );
			}
			onChange( item.join( '' ) );
		}
	};

	const onPasteInput = ( e, index ) => {
		e.preventDefault();

		let clipText = e.clipboardData.getData( 'text/plain' );
		let numbers = getListNumFromText( clipText );
		if ( numbers.length === 0 ) {
			return;
		}

		// Tạo mảng kết quả với độ dài valueLength
		let result = [];

		// Điền * cho các vị trí trước index hiện tại
		for ( let i = 0; i < index; i++ ) {
			result.push( '*' );
		}

		// Điền số từ vị trí index
		for ( let i = 0; i < numbers.length && ( index + i ) < valueLength; i++ ) {
			result[ index + i ] = numbers[ i ];
		}

		// Điền * cho các vị trí còn lại nếu cần
		while ( result.length < valueLength ) {
			result.push( '*' );
		}

		onChange( result.join( '' ) );

		// Focus đến input cuối cùng được điền
		setTimeout( () => {
			const nextIndex = Math.min( index + numbers.length, valueLength - 1 );
			const nextInput = e.target.parentElement.children[ nextIndex ];
			if ( nextInput ) {
				nextInput.focus();
			}
		}, 0 );
	};

	const getListNumFromText = ( text ) => {
		// Lọc chỉ lấy các ký tự số
		let numbers = text.split( '' ).filter( ( char ) => /^\d$/.test( char ) );

		// Giới hạn số lượng ký tự theo valueLength
		if ( numbers.length > valueLength ) {
			numbers = numbers.slice( 0, valueLength );
		}

		return numbers;
	};

	return (
		<div className={ clsx( 'flex', containerStyle ) }>
			{ valueItems.map( ( digit, idx ) => (
				<input
					key={ idx }
					type={ type }
					inputMode="numeric"
					autoComplete="one-time-code"
					onPaste={ ( e ) => onPasteInput( e, idx ) }
					pattern="\d{1}"
					maxLength={ valueLength }
					className={ clsx( inputStyle, 'focus:border-primary focus:border-1 outline-none' ) }
					style={{ fontSize: '16px' }} // Ensure font size is at least 16px to prevent zooming on mobile
					onKeyPress={ ( e ) => {
						if ( e.key === 'Enter' ) {
							onSubmit && onSubmit( value );
						}
					} }
					value={ digit }
					onChange={ ( e ) => inputOnChange( e, idx ) }
					onKeyDown={ ( e ) => inputOnKeyDown( e, idx ) }
					onFocus={ ( e ) => inputOnFocus( e, idx ) }
				/>
			) ) }
		</div>
	);
};


