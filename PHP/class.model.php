<?php namespace ec_main\lib;

use \elusive\debug\Debug;

abstract class Model
{
	/*==[ DECLARATION: Protected Members ]=========================*/
	static private $pdo       = NULL;
	static private $pdo_q     = array();
	static private $connected = FALSE;

	static protected $queries   = array();

	/**
	 *  class constructor
	 */
	public function __construct()
	{
		$c = get_called_class();

		if(!self::$connected)
		{
			try
			{
				$dsn = DB_TYPE . ':dbname=' . DB_NAME . ';host=' . DB_HOST;
				self::$pdo = new \PDO($dsn, DB_USER, DB_PASS);

				if(self::$pdo->query('SHOW TABLES')) { self::$connected = TRUE; }
			}
			catch(\PDOException $e) { self::$connected = FALSE; }
		}

		// CREATE PDO STATEMENTS & BIND PARAMETERS
		foreach(static::$queries as $k => $q)
		{
			if(!isset(self::$pdo_q[$c.'_'.$k]))
			{
				self::$pdo_q[$c.'_'.$k] = self::$pdo->prepare($q);
				$this->bind_params($q, self::$pdo_q[$c.'_'.$k]);
			}
		}
	}

	/**
	 * Query Handler
	 *
	 * @param string $q name of prepared statement
	 * @param array $data optional array of key value pairs
	 * @param string $ret optional return type
	 *     Options are:
	 *         FETCH_ASSOC
	 *         FETCH_BOTH
	 *         FETCH_NUM
	 *         FETCH_OBJ
	 *         LAST_INSERT_ID
	 *         ROW_COUNT
	 *
	 * @return boolean
	 */
	static protected function query($q, $data = array(), $ret = 'FETCH_ASSOC')
	{
		// Make sure we're calling the right Query
		$c = get_called_class();
		$k = $c.'_'.$q;

		$data = self::filter_data($data, static::$queries[$q]);

		if(is_array($data) && isset(self::$pdo_q[$k]))
		{
			if(!self::$pdo_q[$k]->execute($data))
			{
				self::error('query', self::$pdo_q[$k]->errorInfo());
				return FALSE;
			}

			switch($ret)
			{
				case 'FETCH_ASSOC':    return self::$pdo_q[$k]->fetchAll(\PDO::FETCH_ASSOC); break;
				case 'FETCH_BOTH':     return self::$pdo_q[$k]->fetchAll(\PDO::FETCH_BOTH);  break;
				case 'FETCH_NUM':      return self::$pdo_q[$k]->fetchAll(\PDO::FETCH_NUM);   break;
				case 'FETCH_OBJ':      return self::$pdo_q[$k]->fetchAll(\PDO::FETCH_OBJ);   break;
				case 'LAST_INSERT_ID': return self::$pdo->lastInsertId();                    break;
				case 'ROW_COUNT':      return self::$pdo_q[$k]->rowCount();                  break;

				default: return TRUE;
			}
		}
		else
		{
			self::error('misc', "Invalid call to {$c}::query().");
			return FALSE;
		}
	}


	/**
	 * Data filtering method
	 *
	 * @param array $data data array to be filtered
	 * @param string $q query string to filter by
	 *
	 * @return array
	 */
	static private function filter_data($data, $q)
	{
		preg_match_all("/:\w+/", $q, $params, PREG_SET_ORDER);

		$new_data = array();

		foreach($params as $param)
		{
			$param[1] = ltrim($param[0], ":");
			$new_data[$param[1]] = (isset($data[$param[1]])) ? $data[$param[1]] : '';
		}

		return $new_data;
	}

	/**
	 * Map data variables to bound parameters
	 *
	 * @param array $data data array to be mapped
	 *
	 * @return boolean
	 */
	protected function map_data(&$data)
	{
		foreach($this->data as $k => $v)
		{
			//if(isset($data[$k]))
			if(isset($data[$k]))
			{
				// Populate cleaned / valid data
				$this->data[$k] = $this->format_data($k, $data[$k]);
			}
			else if(isset($data[$k]) && FALSE)
			{
				// Error on unclean / invalid data
				throw new Exception(self::ERR_DATA);
			}
			else
			{
				// Blank Default for unset data
				$this->data[$k] = '';
			}
		}
		return true;
	}

	/**
	 * Bind parameters for PDO statements
	 *
	 * @param string $q query to be parsed
	 * @param string $s PDO statement to bind parmeters to
	 */
	protected function bind_params($q, $s)
	{
		preg_match_all("/:\w+/", $q, $params, PREG_SET_ORDER);

		foreach($params as $param)
		{
			$param[1] = ltrim($param[0], ":");
			$this->data[$param[1]] = "";
			$s->bindParam($param[0], $this->data[$param[1]]);
		}
	}


	/**
	 * Specific data formatting - override in concrete model
	 *
	 * @param string $k data array key
	 * @param string $v value to be formatted
	 *
	 * @return string
	 */
	protected function format_data($k, $v)
	{
		return $v;
	}


	/**
	 * Simple error handling
	 *
	 * @param string $type type of error
	 * @param mixed $data error data
	 * @param string $method OPTIONAL pass the method name where the error occurred
	 *
	 * @return string
	 */
	static protected function error($type, $data, $method = '')
	{
		switch($type)
		{
			case 'data':
				trigger_error($method . " Data mapping failed <pre>" . print_r($data,1) . "</pre>");
				break;

			case 'query':
				trigger_error($method . " Query failed with error: [{$data[2]}]");
				break;

			case 'required':
				trigger_error($method . " Missing required data field [{$data}]");
				break;

			case 'misc':
			default:
				trigger_error($method . '<pre>' . print_r($data,1) . '</pre>');
		}

	} /*==[ END: map_data() ]==*/
}