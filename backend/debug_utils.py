"""
Debugging utilities for the FairAI project.
Provides enhanced logging, performance monitoring, and debugging tools.
"""

import logging
import time
import functools
import inspect
import os
import sys
import traceback
from typing import Callable, Any, Dict, List, Optional, TypeVar, cast
from functools import wraps
from pathlib import Path
import json
import pandas as pd
import numpy as np
from datetime import datetime

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('debug.log')
    ]
)
logger = logging.getLogger(__name__)

# Type variable for generic function typing
F = TypeVar('F', bound=Callable[..., Any])

class DebugTimer:
    """Context manager for timing code blocks."""
    
    def __init__(self, name: str = "Block"):
        self.name = name
    
    def __enter__(self):
        self.start_time = time.perf_counter()
        print(f"\n=== Timer Started: {self.name} ===")
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        self.end_time = time.perf_counter()
        self.duration = self.end_time - self.start_time
        print(f"{self.name} took {self.duration:.4f} seconds")
        print("===========================\n")
        return False

def log_function_call(level: int = 0):
    """Decorator to print function calls with arguments and return values."""
    def decorator(func: F) -> F:
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Get function signature
            sig = inspect.signature(func)
            bound_args = sig.bind(*args, **kwargs)
            bound_args.apply_defaults()
            
            # Print function call
            print(f"\n=== Function Call ===")
            print(f"Function: {func.__qualname__}")
            print(f"Arguments: {bound_args.arguments}")
            
            try:
                # Execute the function
                start_time = time.perf_counter()
                result = func(*args, **kwargs)
                end_time = time.perf_counter()
                
                # Print the result and timing
                result_str = str(result)
                if len(result_str) > 500:  # Truncate long results
                    result_str = result_str[:500] + "... [truncated]"
                
                print(f"Execution time: {(end_time - start_time):.4f} seconds")
                print(f"Returned: {result_str}")
                print("===================\n")
                
                return result
                
            except Exception as e:
                # Print the exception
                print(f"\n!!! Error in {func.__qualname__}:")
                print(f"Error: {str(e)}")
                traceback.print_exc()
                print("===================\n")
                raise
                
        return cast(F, wrapper)
    return decorator

class DebugContext:
    """Context manager for managing debug state."""
    
    def __init__(self, debug: bool = True):
        self.original_debug = {}
        self.debug = debug
    
    def __enter__(self):
        if self.debug:
            # Store original log levels
            self.original_debug['root'] = logging.getLogger().level
            self.original_debug['__main__'] = logging.getLogger('__main__').level
            
            # Set debug log levels
            logging.getLogger().setLevel(logging.DEBUG)
            logging.getLogger('__main__').setLevel(logging.DEBUG)
            
            logger.info("Debug mode enabled")
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        if self.debug:
            # Restore original log levels
            for name, level in self.original_debug.items():
                logging.getLogger(name).setLevel(level)
            
            if exc_type is not None:
                logger.error(f"Exception occurred: {exc_val}", exc_info=True)
            
            logger.info("Debug mode disabled")
        return False

def enable_debug_logging():
    """Enable debug logging for all loggers."""
    logging.getLogger().setLevel(logging.DEBUG)
    for name in logging.root.manager.loggerDict:
        logging.getLogger(name).setLevel(logging.DEBUG)

class DataProfiler:
    """Class for profiling and debugging data structures."""
    
    @staticmethod
    def profile_dataframe(df: pd.DataFrame, name: str = "DataFrame") -> Dict[str, Any]:
        """Generate a profile of a pandas DataFrame."""
        if not isinstance(df, pd.DataFrame):
            return {"error": f"Expected pandas DataFrame, got {type(df).__name__}"}
        
        profile = {
            "name": name,
            "shape": df.shape,
            "memory_usage": f"{df.memory_usage(deep=True).sum() / (1024**2):.2f} MB",
            "dtypes": df.dtypes.astype(str).to_dict(),
            "missing_values": df.isnull().sum().to_dict(),
            "numeric_stats": {},
            "categorical_stats": {}
        }
        
        # Numeric columns statistics
        numeric_cols = df.select_dtypes(include=['number']).columns
        if not numeric_cols.empty:
            profile["numeric_stats"] = df[numeric_cols].describe().to_dict()
        
        # Categorical columns statistics
        cat_cols = df.select_dtypes(include=['object', 'category']).columns
        if not cat_cols.empty:
            for col in cat_cols:
                profile["categorical_stats"][col] = {
                    "unique_values": df[col].nunique(),
                    "top_values": df[col].value_counts().head(5).to_dict()
                }
        
        return profile
    
    @staticmethod
    def save_profile(profile: Dict[str, Any], output_file: str = "data_profile.json"):
        """Save data profile to a JSON file."""
        with open(output_file, 'w') as f:
            json.dump(profile, f, indent=2, default=str)
        logger.info(f"Data profile saved to {output_file}")

def debug_save_data(data: Any, name: str, output_dir: str = "debug_data"):
    """Save data to a file for debugging purposes."""
    os.makedirs(output_dir, exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    
    if isinstance(data, pd.DataFrame):
        filename = os.path.join(output_dir, f"{name}_{timestamp}.parquet")
        data.to_parquet(filename)
    elif isinstance(data, np.ndarray):
        filename = os.path.join(output_dir, f"{name}_{timestamp}.npy")
        np.save(filename, data)
    elif isinstance(data, dict):
        filename = os.path.join(output_dir, f"{name}_{timestamp}.json")
        with open(filename, 'w') as f:
            json.dump(data, f, indent=2, default=str)
    else:
        filename = os.path.join(output_dir, f"{name}_{timestamp}.txt")
        with open(filename, 'w') as f:
            f.write(str(data))
    
    logger.debug(f"Debug data saved to {filename}")
    return filename

# Add debug utilities to the root logger
logging.DebugTimer = DebugTimer
logging.DebugContext = DebugContext
logging.DataProfiler = DataProfiler
logging.debug_save_data = debug_save_data
